import { db } from "@/lib/db";
import { requireOfficial } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { liveTally } from "@/lib/sve/tally";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const orgId = member.role === "PLATFORM_ADMIN" ? undefined : member.organizationId;

  const url = new URL(req.url);
  const ids = url.searchParams.getAll("id");

  // If specific IDs provided, use them; otherwise get all elections
  const where = ids.length > 0
    ? { id: { in: ids }, ...(orgId ? { organizationId: orgId } : {}) }
    : (orgId ? { organizationId: orgId } : {});

  const elections = await db.election.findMany({
    where,
    orderBy: { startTime: "desc" },
    select: {
      id: true, name: true, status: true, startTime: true, endTime: true,
      certifiedAt: true, visibility: true,
      _count: { select: { votes: { where: { isSimulation: false } }, positions: true, voters: true } },
    },
  });

  // Get tallies for each election
  const comparisons = await Promise.all(
    elections.map(async (e) => {
      const tally = await liveTally(e.id);
      return {
        id: e.id,
        name: e.name,
        status: e.status,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        certifiedAt: e.certifiedAt?.toISOString() ?? null,
        visibility: e.visibility,
        totalVotes: tally.totalVotes,
        totalEligible: tally.totalEligible,
        turnoutPct: Math.round(tally.turnoutPct * 10) / 10,
        positionsCount: e._count.positions,
        positions: tally.positions.map((p) => ({
          title: p.positionTitle,
          totalVotes: p.totalVotes,
          notaVotes: p.notaVotes,
          candidates: p.candidates.map((c) => ({
            name: c.name,
            votes: c.votes,
            pct: Math.round(c.pct * 10) / 10,
            isWinner: p.winners.includes(c.candidateId),
          })),
        })),
      };
    })
  );

  return ok({ elections: comparisons });
});
