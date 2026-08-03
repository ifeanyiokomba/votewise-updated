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
  const input = await parseBody(req, schemas.createPosition);
  const last = await db.position.findFirst({ where: { electionId: election.id }, orderBy: { displayOrder: "desc" } });
  const position = await db.position.create({
    data: {
      electionId: election.id,
      title: input.title,
      description: input.description,
      maxVotes: input.maxVotes,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });
  await audit({
    organizationId, actorId: memberId, actorRole: memberRole, actorName: memberName,
    action: "POSITION_CREATED", resource: "position", resourceId: position.id,
    details: { electionId: election.id, title: position.title },
  });
  return ok({ position });
});
