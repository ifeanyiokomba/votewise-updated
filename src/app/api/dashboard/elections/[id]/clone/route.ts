import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const cloneSchema = z.object({
  newName: z.string().min(3).max(120).optional(),
  newStartTime: z.string().datetime().optional(),
  newEndTime: z.string().datetime().optional(),
});

export const POST = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }

  const source = await db.election.findUnique({
    where: { id },
    include: {
      positions: { include: { candidates: true } },
    },
  });
  if (!source) throw new HttpError("NOT_FOUND", "Election not found", 404);
  if (member.role !== "PLATFORM_ADMIN" && source.organizationId !== member.organizationId) {
    throw new HttpError("FORBIDDEN", "Election belongs to a different organization", 403);
  }

  const input = await cloneSchema.parse(await req.json().catch(() => ({})));

  // Default new times: start 7 days from now, end 7 days + 6 hours
  const startTime = input.newStartTime ? new Date(input.newStartTime) : new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const endTime = input.newEndTime ? new Date(input.newEndTime) : new Date(startTime.getTime() + 6 * 60 * 60_000);

  if (endTime <= startTime) throw new HttpError("VALIDATION", "End time must be after start time", 400);

  // Clone election + positions + candidates in a transaction
  const cloned = await db.$transaction(async (tx) => {
    const newElection = await tx.election.create({
      data: {
        organizationId: source.organizationId,
        name: input.newName ?? `${source.name} (Copy)`,
        description: source.description,
        status: "DRAFT",
        visibility: source.visibility,
        startTime,
        endTime,
        showLiveResults: source.showLiveResults,
        hideResultsUntilEnd: source.hideResultsUntilEnd,
        requireAccreditation: source.requireAccreditation,
        notaEnabled: source.notaEnabled,
        ballotRandomization: source.ballotRandomization,
      },
    });

    // Clone positions + candidates
    for (const pos of source.positions) {
      const newPos = await tx.position.create({
        data: {
          electionId: newElection.id,
          title: pos.title,
          description: pos.description,
          maxVotes: pos.maxVotes,
          displayOrder: pos.displayOrder,
        },
      });
      for (const cand of pos.candidates) {
        await tx.candidate.create({
          data: {
            positionId: newPos.id,
            name: cand.name,
            bio: cand.bio,
            manifesto: cand.manifesto,
            slogan: cand.slogan,
            photoUrl: cand.photoUrl,
            status: cand.status,
            screeningStatus: cand.screeningStatus,
            displayOrder: cand.displayOrder,
          },
        });
      }
    }

    await tx.electionEvent.create({
      data: {
        electionId: newElection.id,
        eventType: "CREATED",
        actorId: member.id,
        actorName: member.name,
        details: JSON.stringify({ clonedFrom: source.id, clonedFromName: source.name }),
      },
    });

    return newElection;
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "ELECTION_CLONED", resource: "election", resourceId: cloned.id,
    details: { sourceId: source.id, sourceName: source.name, newName: cloned.name },
  });

  return ok({ election: { id: cloned.id, name: cloned.name, status: cloned.status } });
});
