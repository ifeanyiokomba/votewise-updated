import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const member = await requireOfficial();
  const { id } = await params;

  const voter = await db.voter.findUnique({
    where: { id },
    select: {
      id: true, identifier: true, fullName: true, email: true, phone: true,
      hasVoted: true, votedAt: true, flagged: true, flaggedReason: true,
      createdAt: true, updatedAt: true, organizationId: true,
    },
  });
  if (!voter) throw new HttpError("NOT_FOUND", "Voter not found", 404);
  if (member.role !== "PLATFORM_ADMIN" && voter.organizationId !== member.organizationId) {
    throw new HttpError("FORBIDDEN", "Not your voter", 403);
  }

  // Get eligibility across elections
  const eligibilities = await db.voterEligibility.findMany({
    where: { voterId: id },
    include: {
      election: {
        select: { id: true, name: true, status: true, startTime: true, endTime: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get vote records (receipts) — no candidateId/anonymity preserved on the voter side too
  const voteRecords = await db.voteRecord.findMany({
    where: { voterId: id, isSimulation: false },
    select: {
      id: true, receiptCode: true, positionId: true, isNota: true, createdAt: true,
      position: { select: { title: true, electionId: true, election: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get audit events for this voter
  const auditEvents = await db.auditLog.findMany({
    where: { actorId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, details: true, createdAt: true, ipAddress: true },
  });

  return ok({
    voter: { ...voter, organizationId: undefined },
    eligibilities: eligibilities.map((e) => ({
      electionId: e.electionId,
      electionName: e.election.name,
      electionStatus: e.election.status,
      accredited: e.accredited,
      accreditedAt: e.accreditedAt,
    })),
    voteRecords: voteRecords.map((v) => ({
      id: v.id,
      receiptCode: v.receiptCode,
      positionTitle: v.position.title,
      electionName: v.position.election.name,
      isNota: v.isNota,
      createdAt: v.createdAt,
    })),
    auditEvents: auditEvents.map((a) => ({
      action: a.action,
      details: a.details,
      createdAt: a.createdAt,
      ipAddress: a.ipAddress,
    })),
  });
});
