import { db } from "@/lib/db";
import { api, parseBody, ok } from "@/lib/api";
import { getScopedElection, assertManage } from "@/lib/election-access";
import { schemas } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election } = await getScopedElection(id);
  const positions = await db.position.findMany({
    where: { electionId: election.id },
    orderBy: { displayOrder: "asc" },
    include: { candidates: { orderBy: { displayOrder: "asc" } } },
  });
  return ok({ positions });
});

export const POST = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election, memberId, memberRole, memberName, organizationId } = await getScopedElection(id);
  assertManage(memberRole);
  if (election.status === "LIVE" || election.status === "CERTIFIED") {
    throw new HttpError("CONFLICT", "Cannot modify a LIVE or CERTIFIED election", 409);
  }
  const input = await parseBody(req, schemas.createCandidate);
  // positionId may be passed on the body
  const body = await req.json().catch(() => ({}));
  const positionId = (body as { positionId?: string }).positionId;
  if (!positionId) throw new HttpError("VALIDATION", "positionId is required", 400);
  const position = await db.position.findFirst({ where: { id: positionId, electionId: election.id } });
  if (!position) throw new HttpError("NOT_FOUND", "Position not found in this election", 404);
  const last = await db.candidate.findFirst({ where: { positionId }, orderBy: { displayOrder: "desc" } });
  const candidate = await db.candidate.create({
    data: {
      positionId,
      name: input.name,
      bio: input.bio,
      manifesto: input.manifesto,
      slogan: input.slogan,
      photoUrl: input.photoUrl,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });
  await audit({
    organizationId, actorId: memberId, actorRole: memberRole, actorName: memberName,
    action: "CANDIDATE_CREATED", resource: "candidate", resourceId: candidate.id,
    details: { electionId: election.id, positionId, name: candidate.name },
  });
  return ok({ candidate });
});
