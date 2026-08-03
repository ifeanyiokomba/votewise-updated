import { db } from "@/lib/db";
import { requireOfficial } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const orgId = member.organizationId;

  // all elections with stats
  const elections = await db.election.findMany({
    where: { organizationId: orgId },
    orderBy: { startTime: "desc" },
    select: {
      id: true, name: true, status: true, startTime: true, endTime: true,
      _count: { select: { votes: { where: { isSimulation: false } }, positions: true, voters: true } },
    },
  });

  // vote records per day (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const votes = await db.voteRecord.findMany({
    where: { election: { organizationId: orgId }, isSimulation: false, createdAt: { gte: since } },
    select: { createdAt: true, electionId: true },
  });

  // group by day
  const dailyVotes: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60_000);
    const key = d.toISOString().slice(0, 10);
    dailyVotes[key] = 0;
  }
  for (const v of votes) {
    const key = v.createdAt.toISOString().slice(0, 10);
    if (key in dailyVotes) dailyVotes[key]++;
  }

  const daily = Object.entries(dailyVotes).map(([date, count]) => ({ date, count }));

  // aggregate stats
  const totalVotes = elections.reduce((s, e) => s + e._count.votes, 0);
  const totalEligible = elections.reduce((s, e) => s + e._count.voters, 0);
  const avgTurnout = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0;

  // per-election summary for comparison
  const comparison = elections.map((e) => {
    const turnout = e._count.voters > 0 ? (e._count.votes / e._count.voters) * 100 : 0;
    return {
      id: e.id,
      name: e.name,
      status: e.status,
      startTime: e.startTime,
      endTime: e.endTime,
      votes: e._count.votes,
      eligible: e._count.voters,
      positions: e._count.positions,
      turnout: Math.round(turnout * 10) / 10,
    };
  });

  return ok({
    summary: {
      totalElections: elections.length,
      totalVotes,
      totalEligible,
      avgTurnout: Math.round(avgTurnout * 10) / 10,
      liveCount: elections.filter((e) => e.status === "LIVE").length,
      certifiedCount: elections.filter((e) => e.status === "CERTIFIED").length,
    },
    comparison,
    daily,
  });
});
