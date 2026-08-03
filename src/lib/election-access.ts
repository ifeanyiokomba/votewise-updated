import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import type { Election } from "@prisma/client";

/** Load an election and verify the current member belongs to its org. */
export async function getScopedElection(electionId: string): Promise<{ election: Election; memberId: string; memberRole: string; memberName: string; organizationId: string }> {
  const member = await requireOfficial();
  const election = await db.election.findUnique({ where: { id: electionId } });
  if (!election) throw new HttpError("NOT_FOUND", "Election not found", 404);
  if (member.role !== "PLATFORM_ADMIN" && election.organizationId !== member.organizationId) {
    throw new HttpError("FORBIDDEN", "Election belongs to a different organization", 403);
  }
  return { election, memberId: member.id, memberRole: member.role, memberName: member.name, organizationId: member.organizationId };
}

export function assertManage(role: string) {
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
}
