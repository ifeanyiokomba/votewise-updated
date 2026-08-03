import { db } from "@/lib/db";
import { hmacSign, sha256, decryptChoice } from "@/lib/sve/crypto";
import { HttpError } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import type { Election } from "@prisma/client";

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  totalVotes: number;
  notaVotes: number;
  invalidVotes: number;
  candidates: Array<{ candidateId: string; name: string; votes: number; pct: number }>;
  winners: string[];
}

export interface TallyResult {
  electionId: string;
  totalVotes: number;
  totalEligible: number;
  turnoutPct: number;
  positions: PositionResult[];
}

/** Live tally — reads CandidateTally (O(positions×candidates), not O(votes)). */
export async function liveTally(electionId: string): Promise<TallyResult> {
  const election = await db.election.findUniqueOrThrow({ where: { id: electionId } });
  const positions = await db.position.findMany({
    where: { electionId },
    orderBy: { displayOrder: "asc" },
    include: { candidates: { where: { status: "APPROVED" }, orderBy: { displayOrder: "asc" } } },
  });
  const tallies = await db.candidateTally.findMany({ where: { electionId } });
  const tallyMap = new Map(tallies.map((t) => [`${t.positionId}:${t.candidateId}`, t.count]));

  // NOTA + total counts per position come from VoteRecord
  const voteAgg = await db.voteRecord.groupBy({
    by: ["positionId"],
    where: { electionId, isSimulation: false },
    _count: { _all: true },
  });
  const notaAgg = await db.voteRecord.groupBy({
    by: ["positionId"],
    where: { electionId, isSimulation: false, isNota: true },
    _count: { _all: true },
  });
  const totalMap = new Map(voteAgg.map((a) => [a.positionId, a._count._all]));
  const notaMap = new Map(notaAgg.map((a) => [a.positionId, a._count._all]));

  const totalEligible = await db.voterEligibility.count({ where: { electionId } });
  const totalVotes = voteAgg.reduce((s, a) => s + a._count._all, 0);

  const positionsResult: PositionResult[] = positions.map((p) => {
    const total = totalMap.get(p.id) ?? 0;
    const nota = notaMap.get(p.id) ?? 0;
    const cands = p.candidates.map((c) => ({
      candidateId: c.id,
      name: c.name,
      votes: tallyMap.get(`${p.id}:${c.id}`) ?? 0,
      pct: total > 0 ? ((tallyMap.get(`${p.id}:${c.id}`) ?? 0) / total) * 100 : 0,
    }));
    const max = Math.max(0, ...cands.map((c) => c.votes));
    const winners = cands.filter((c) => c.votes === max && max > 0).map((c) => c.candidateId);
    return {
      positionId: p.id,
      positionTitle: p.title,
      totalVotes: total,
      notaVotes: nota,
      invalidVotes: 0,
      candidates: cands.sort((a, b) => b.votes - a.votes),
      winners,
    };
  });

  return {
    electionId,
    totalVotes,
    totalEligible,
    turnoutPct: totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0,
    positions: positionsResult,
  };
}

/** Full certification — decrypts all votes, computes auditHash + signature. */
export async function certifyElection(electionId: string, actorId: string, actorName: string): Promise<TallyResult> {
  const election = await db.election.findUniqueOrThrow({ where: { id: electionId } });
  if (election.status !== "CLOSED") {
    throw new HttpError("CONFLICT", "Election must be CLOSED before certification", 409);
  }

  const tally = await liveTally(electionId);

  // gather all vote records for auditHash
  const votes = await db.voteRecord.findMany({
    where: { electionId, isSimulation: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, receiptCode: true, positionId: true, createdAt: true },
  });
  const auditHash = sha256(
    votes.map((v) => [v.id, v.receiptCode, v.positionId, v.createdAt.toISOString()].join("|")).sort().join("|")
  );
  const integritySignature = hmacSign("verification:" + auditHash);

  await db.$transaction(async (tx) => {
    await tx.electionVerification.upsert({
      where: { electionId },
      update: {
        totalEligible: tally.totalEligible,
        totalVotes: tally.totalVotes,
        invalidVotes: 0,
        blankVotes: tally.positions.reduce((s, p) => s + p.notaVotes, 0),
        turnoutPct: tally.turnoutPct,
        auditHash,
        integritySignature,
        certifiedAt: new Date(),
      },
      create: {
        electionId,
        totalEligible: tally.totalEligible,
        totalVotes: tally.totalVotes,
        invalidVotes: 0,
        blankVotes: tally.positions.reduce((s, p) => s + p.notaVotes, 0),
        turnoutPct: tally.turnoutPct,
        auditHash,
        integritySignature,
      },
    });
    await tx.election.update({
      where: { id: electionId },
      data: { status: "CERTIFIED", certifiedAt: new Date() },
    });
    await tx.electionEvent.create({
      data: {
        electionId,
        eventType: "CERTIFIED",
        actorId,
        actorName,
        details: JSON.stringify({ auditHash, turnoutPct: tally.turnoutPct }),
      },
    });
    await writeAudit(tx, {
      organizationId: election.organizationId,
      actorId,
      actorName,
      action: "ELECTION_CERTIFIED",
      resource: "election",
      resourceId: electionId,
      details: { auditHash, totalVotes: tally.totalVotes, turnoutPct: tally.turnoutPct },
    });
  });

  return tally;
}
