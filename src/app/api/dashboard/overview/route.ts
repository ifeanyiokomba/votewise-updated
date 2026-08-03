import { db } from "@/lib/db";
import { requireOfficial } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const orgId = member.organizationId;

  const [
    totalElections,
    liveElections,
    totalVoters,
    totalVotes,
    totalMembers,
    openIncidents,
    recentElections,
    recentAudit,
    recentIncidents,
  ] = await Promise.all([
    db.election.count({ where: { organizationId: orgId } }),
    db.election.count({ where: { organizationId: orgId, status: "LIVE" } }),
    db.voter.count({ where: { organizationId: orgId } }),
    db.voteRecord.count({ where: { election: { organizationId: orgId }, isSimulation: false } }),
    db.organizationMember.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    db.electionIncident.count({ where: { organizationId: orgId, status: { in: ["OPEN", "INVESTIGATING"] } } }),
    db.election.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, startTime: true, endTime: true, _count: { select: { votes: { where: { isSimulation: false } } } } },
    }),
    db.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, actorName: true, createdAt: true, resource: true },
    }),
    db.electionIncident.findMany({
      where: { organizationId: orgId, status: { in: ["OPEN", "INVESTIGATING"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { election: { select: { name: true } } },
    }),
  ]);

  return ok({
    stats: { totalElections, liveElections, totalVoters, totalVotes, totalMembers, openIncidents },
    recentElections,
    recentAudit,
    recentIncidents,
  });
});
