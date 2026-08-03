import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { schemas } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  if (member.role === "PLATFORM_ADMIN") {
    const elections = await db.election.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, status: true, visibility: true,
        startTime: true, endTime: true, createdAt: true,
        organization: { select: { name: true, subdomain: true } },
        _count: { select: { votes: { where: { isSimulation: false } }, positions: true } },
      },
    });
    return ok({ elections });
  }
  const elections = await db.election.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, status: true, visibility: true,
      startTime: true, endTime: true, createdAt: true,
      _count: { select: { votes: { where: { isSimulation: false } }, positions: true } },
    },
  });
  return ok({ elections });
});

export const POST = api(async (req) => {
  const input = await parseBody(req, schemas.createElection);
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  if (new Date(input.endTime) <= new Date(input.startTime)) {
    throw new HttpError("VALIDATION", "End time must be after start time", 400);
  }
  const election = await db.election.create({
    data: {
      organizationId: member.organizationId,
      name: input.name,
      description: input.description,
      status: "DRAFT",
      visibility: input.visibility,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      showLiveResults: input.showLiveResults,
      hideResultsUntilEnd: input.hideResultsUntilEnd,
      requireAccreditation: input.requireAccreditation,
      notaEnabled: input.notaEnabled,
      ballotRandomization: input.ballotRandomization,
    },
  });
  await db.electionEvent.create({
    data: { electionId: election.id, eventType: "CREATED", actorId: member.id, actorName: member.name },
  });
  await audit({
    organizationId: member.organizationId,
    actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "ELECTION_CREATED", resource: "election", resourceId: election.id,
    details: { name: election.name },
  });
  return ok({ election });
});
