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

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status"); // "voted" | "not_voted" | undefined

  const voters = await db.voter.findMany({
    where: {
      eligibilities: { some: { electionId: election.id } },
      ...(search ? {
        OR: [
          { identifier: { contains: search } },
          { fullName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ]
      } : {}),
      ...(status === "voted" ? { hasVoted: true } : status === "not_voted" ? { hasVoted: false } : {}),
    },
    orderBy: { fullName: "asc" },
    take: 500,
    select: {
      id: true, identifier: true, fullName: true, email: true, phone: true,
      hasVoted: true, votedAt: true, flagged: true, flaggedReason: true,
    },
  });

  const total = await db.voterEligibility.count({ where: { electionId: election.id } });
  const voted = await db.voterEligibility.count({ where: { electionId: election.id, voter: { hasVoted: true } } });

  return ok({
    voters,
    stats: { total, voted, notVoted: total - voted, turnoutPct: total > 0 ? (voted / total) * 100 : 0 },
  });
});

export const POST = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election, memberId, memberRole, memberName, organizationId } = await getScopedElection(id);
  assertManage(memberRole);
  if (election.status !== "DRAFT") {
    throw new HttpError("CONFLICT", "Voter import is locked (election is not in DRAFT)", 409);
  }
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
