/**
 * VoteWise results-service — real-time results broadcast.
 *
 * - socket.io server on port 3030 (public, via Caddy ?XTransformPort=3030)
 * - internal HTTP bump endpoint on port 3031 (loopback only)
 *
 * Rooms: `election:<id>` — clients join to receive live tally updates.
 * On `bump(electionId)` we recompute the tally from the DB and broadcast
 * to all subscribers in that room.
 *
 * Fallback: a 5s polling loop also recomputes active elections so a missed
 * bump never leaves results stale.
 */

import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const PUBLIC_PORT = 3030;
const INTERNAL_PORT = 3031;

// ---- tally computation (mirrors src/lib/sve/tally.ts) ----
async function computeTally(electionId: string) {
  const election = await db.election.findUnique({ where: { id: electionId } });
  if (!election) return null;

  const now = new Date();
  const isClosed = ["CLOSED", "CERTIFIED"].includes(election.status);
  const isLive = election.status === "LIVE";
  const showResults =
    isClosed || (isLive && election.showLiveResults && !election.hideResultsUntilEnd);

  const totalVotes = await db.voteRecord.count({
    where: { electionId, isSimulation: false },
  });
  const totalEligible = await db.voterEligibility.count({ where: { electionId } });

  if (!showResults) {
    return {
      electionId,
      name: election.name,
      status: election.status,
      hidden: true,
      totalVotes,
      totalEligible,
      turnoutPct: totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0,
      positions: [],
      serverTime: now.toISOString(),
    };
  }

  const positions = await db.position.findMany({
    where: { electionId },
    orderBy: { displayOrder: "asc" },
    include: {
      candidates: { where: { status: "APPROVED" }, orderBy: { displayOrder: "asc" } },
    },
  });
  const tallies = await db.candidateTally.findMany({ where: { electionId } });
  const tallyMap = new Map(tallies.map((t) => [`${t.positionId}:${t.candidateId}`, t.count]));
  const notaAgg = await db.voteRecord.groupBy({
    by: ["positionId"],
    where: { electionId, isSimulation: false, isNota: true },
    _count: { _all: true },
  });
  const notaMap = new Map(notaAgg.map((a) => [a.positionId, a._count._all]));

  const positionsResult = positions.map((p) => {
    const total = (tallyMap.get(`${p.id}:`) ?? 0); // not used; compute from sum
    const cands = p.candidates.map((c) => ({
      candidateId: c.id,
      name: c.name,
      votes: tallyMap.get(`${p.id}:${c.id}`) ?? 0,
    }));
    const sumVotes = cands.reduce((s, c) => s + c.votes, 0);
    const nota = notaMap.get(p.id) ?? 0;
    const totalWithNota = sumVotes + nota;
    return {
      positionId: p.id,
      positionTitle: p.title,
      totalVotes: totalWithNota,
      notaVotes: nota,
      candidates: cands
        .map((c) => ({ ...c, pct: totalWithNota > 0 ? (c.votes / totalWithNota) * 100 : 0 }))
        .sort((a, b) => b.votes - a.votes),
    };
  });

  return {
    electionId,
    name: election.name,
    status: election.status,
    hidden: false,
    certifiedAt: election.certifiedAt,
    totalVotes,
    totalEligible,
    turnoutPct: totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0,
    positions: positionsResult,
    serverTime: now.toISOString(),
  };
}

// ---- socket.io public server ----
const httpServer = createServer((req, res) => {
  // minimal health endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "results", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  socket.on("join", ({ room }: { room: string }) => {
    if (typeof room === "string" && room.startsWith("election:")) {
      socket.join(room);
    }
  });
  socket.on("leave", ({ room }: { room: string }) => {
    if (typeof room === "string") socket.leave(room);
  });
});

httpServer.listen(PUBLIC_PORT, () => {
  console.log(`[results-service] socket.io on :${PUBLIC_PORT}`);
});

// ---- internal bump endpoint (loopback) ----
const internalServer = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/internal/bump") {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    const { electionId } = JSON.parse(body);
    if (typeof electionId === "string") {
      const tally = await computeTally(electionId);
      if (tally) io.to(`election:${electionId}`).emit("results", tally);
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

internalServer.listen(INTERNAL_PORT, "127.0.0.1", () => {
  console.log(`[results-service] internal bump on 127.0.0.1:${INTERNAL_PORT}`);
});

// ---- fallback polling for active elections ----
setInterval(async () => {
  try {
    const active = await db.election.findMany({
      where: { status: "LIVE" },
      select: { id: true },
    });
    for (const e of active) {
      const tally = await computeTally(e.id);
      if (tally) io.to(`election:${e.id}`).emit("results", tally);
    }
  } catch (e) {
    // non-fatal
  }
}, 5000);

// graceful shutdown
process.on("SIGTERM", () => {
  io.close();
  httpServer.close();
  internalServer.close();
  process.exit(0);
});
