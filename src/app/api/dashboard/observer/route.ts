import { db } from "@/lib/db";
import { requireObserver } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireObserver();
  const orgId = member.organizationId;

  const [liveElections, openIncidents, recentVotes, recentEvents] = await Promise.all([
    db.election.findMany({
      where: { organizationId: orgId, status: "LIVE" },
      select: {
        id: true, name: true, startTime: true, endTime: true,
        _count: { select: { votes: { where: { isSimulation: false } } } },
      },
    }),
    db.electionIncident.findMany({
      where: { organizationId: orgId, status: { in: ["OPEN", "INVESTIGATING"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { election: { select: { name: true } } },
    }),
    db.voteRecord.findMany({
      where: { election: { organizationId: orgId }, isSimulation: false },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, receiptCode: true, isNota: true, createdAt: true, positionId: true, position: { select: { title: true, election: { select: { name: true } } } } },
    }),
    db.electionEvent.findMany({
      where: { election: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, eventType: true, actorName: true, createdAt: true, electionId: true, election: { select: { name: true } } },
    }),
  ]);

  const totalVoters = await db.voterEligibility.count({
    where: { election: { organizationId: orgId, status: "LIVE" } },
  });
  const totalVotes = liveElections.reduce((s, e) => s + e._count.votes, 0);
  const turnoutPct = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

  return ok({
    liveElections: liveElections.map((e) => ({
      id: e.id, name: e.name, startTime: e.startTime, endTime: e.endTime,
      votes: e._count.votes,
    })),
    openIncidents,
    recentVotes,
    recentEvents,
    summary: { totalLive: liveElections.length, totalVoters, totalVotes, turnoutPct: Math.round(turnoutPct * 10) / 10, openIncidents: openIncidents.length },
  });
});
