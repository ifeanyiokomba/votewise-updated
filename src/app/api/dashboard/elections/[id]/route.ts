import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { getScopedElection, assertManage } from "@/lib/election-access";
import { HttpError } from "@/lib/guards";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election } = await getScopedElection(id);
  const positions = await db.position.findMany({
    where: { electionId: election.id },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { candidates: true } } },
  });
  const tally = await db.candidateTally.groupBy({
    by: ["positionId"],
    where: { electionId: election.id },
    _sum: { count: true },
  });
  const totalVotes = await db.voteRecord.count({ where: { electionId: election.id, isSimulation: false } });
  const totalEligible = await db.voterEligibility.count({ where: { electionId: election.id } });
  return ok({
    election: {
      id: election.id, name: election.name, description: election.description,
      status: election.status, visibility: election.visibility,
      startTime: election.startTime, endTime: election.endTime,
      showLiveResults: election.showLiveResults, hideResultsUntilEnd: election.hideResultsUntilEnd,
      requireAccreditation: election.requireAccreditation, notaEnabled: election.notaEnabled,
      ballotRandomization: election.ballotRandomization, certifiedAt: election.certifiedAt,
    },
    positions,
    stats: { totalVotes, totalEligible, turnoutPct: totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0 },
    tally: Object.fromEntries(tally.map((t) => [t.positionId, t._sum.count ?? 0])),
  });
});

const updateSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  showLiveResults: z.boolean().optional(),
  hideResultsUntilEnd: z.boolean().optional(),
  requireAccreditation: z.boolean().optional(),
  notaEnabled: z.boolean().optional(),
  ballotRandomization: z.boolean().optional(),
});

export const PATCH = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { election, memberId, memberRole, memberName } = await getScopedElection(id);
  assertManage(memberRole);
  if (election.status === "LIVE" || election.status === "CERTIFIED") {
    throw new HttpError("CONFLICT", "Cannot edit a LIVE or CERTIFIED election", 409);
  }
  const input = updateSchema.parse(await req.json().catch(() => ({})));
  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.startTime) data.startTime = new Date(input.startTime);
  if (input.endTime) data.endTime = new Date(input.endTime);
  if (input.visibility) data.visibility = input.visibility;
  if (input.showLiveResults !== undefined) data.showLiveResults = input.showLiveResults;
  if (input.hideResultsUntilEnd !== undefined) data.hideResultsUntilEnd = input.hideResultsUntilEnd;
  if (input.requireAccreditation !== undefined) data.requireAccreditation = input.requireAccreditation;
  if (input.notaEnabled !== undefined) data.notaEnabled = input.notaEnabled;
  if (input.ballotRandomization !== undefined) data.ballotRandomization = input.ballotRandomization;
  if (data.startTime && data.endTime && new Date(data.endTime as Date) <= new Date(data.startTime as Date)) {
    throw new HttpError("VALIDATION", "End time must be after start time", 400);
  }
  const updated = await db.election.update({ where: { id: election.id }, data });
  void memberId; void memberName;
  return ok({ election: updated });
});
