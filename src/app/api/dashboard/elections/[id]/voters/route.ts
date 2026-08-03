import { db } from "@/lib/db";
import { api, parseBody, ok } from "@/lib/api";
import { getScopedElection, assertManage } from "@/lib/election-access";
import { schemas } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election } = await getScopedElection(id);
  const voters = await db.voter.findMany({
    where: { eligibilities: { some: { electionId: election.id } } },
    orderBy: { fullName: "asc" },
    select: { id: true, identifier: true, fullName: true, email: true, phone: true, hasVoted: true, votedAt: true, flagged: true },
  });
  return ok({ voters });
});

export const POST = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election, memberId, memberRole, memberName, organizationId } = await getScopedElection(id);
  assertManage(memberRole);
  const input = await parseBody(req, schemas.importVoters);

  let created = 0;
  let linked = 0;
  for (const v of input.voters) {
    const voter = await db.voter.upsert({
      where: { organizationId_identifier: { organizationId, identifier: v.identifier } },
      update: { fullName: v.fullName, email: v.email || null, phone: v.phone || null },
      create: {
        organizationId,
        identifier: v.identifier,
        fullName: v.fullName,
        email: v.email || null,
        phone: v.phone || null,
      },
      select: { id: true },
    });
    if (voter) {
      const elig = await db.voterEligibility.upsert({
        where: { electionId_voterId: { electionId: election.id, voterId: voter.id } },
        update: {},
        create: { electionId: election.id, voterId: voter.id },
      });
      if (elig) linked++;
      created++;
    }
  }

  await audit({
    organizationId, actorId: memberId, actorRole: memberRole, actorName: memberName,
    action: "VOTERS_IMPORTED", resource: "election", resourceId: election.id,
    details: { count: created, linked },
  });

  return ok({ imported: created, linked, total: input.voters.length });
});
