import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { getScopedElection } from "@/lib/election-access";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election } = await getScopedElection(id);

  const [totalVotes, totalEligible, totalVoted, positions, recentVotes, tally] = await Promise.all([
    db.voteRecord.count({ where: { electionId: election.id, isSimulation: false } }),
    db.voterEligibility.count({ where: { electionId: election.id } }),
    db.voterEligibility.count({ where: { electionId: election.id, voter: { hasVoted: true } } }),
    db.position.findMany({
      where: { electionId: election.id },
      include: { _count: { select: { candidates: true } } },
      orderBy: { displayOrder: "asc" },
    }),
    db.voteRecord.findMany({
      where: { electionId: election.id, isSimulation: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, receiptCode: true, positionId: true, isNota: true, createdAt: true, position: { select: { title: true } } },
    }),
    db.candidateTally.findMany({
      where: { electionId: election.id },
      include: { candidate: { select: { name: true } }, position: { select: { title: true } } },
      orderBy: { count: "desc" },
    }),
  ]);

  // hourly vote distribution (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const hourlyRaw = await db.voteRecord.findMany({
    where: { electionId: election.id, isSimulation: false, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const hourly: Array<{ hour: string; count: number }> = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(Date.now() - i * 60 * 60_000);
    const hKey = d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const count = hourlyRaw.filter((v) => v.createdAt.toISOString().slice(0, 13) === hKey).length;
    hourly.push({ hour: d.getHours().toString().padStart(2, "0") + ":00", count });
  }

  return ok({
    totalVotes,
    totalEligible,
    totalVoted,
    turnoutPct: totalEligible > 0 ? (totalVoted / totalEligible) * 100 : 0,
    positions: positions.map((p) => ({ id: p.id, title: p.title, candidateCount: p._count.candidates, maxVotes: p.maxVotes })),
    recentVotes,
    tally: tally.map((t) => ({ positionTitle: t.position.title, candidateName: t.candidate.name, count: t.count })),
    hourly,
  });
});
