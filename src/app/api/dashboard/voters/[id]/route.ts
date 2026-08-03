import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  flagged: z.boolean().optional(),
  flaggedReason: z.string().max(200).optional(),
});

export const PATCH = api(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const member = await requireOfficial();
  const { id } = await params;
  const input = await patchSchema.parse(await req.json().catch(() => ({})));

  const voter = await db.voter.findUnique({ where: { id } });
  if (!voter) throw new HttpError("NOT_FOUND", "Voter not found", 404);
  if (member.role !== "PLATFORM_ADMIN" && voter.organizationId !== member.organizationId) {
    throw new HttpError("FORBIDDEN", "Not your voter", 403);
  }

  const updated = await db.voter.update({
    where: { id },
    data: {
      ...(input.flagged !== undefined && { flagged: input.flagged }),
      ...(input.flaggedReason !== undefined && { flaggedReason: input.flaggedReason }),
    },
  });

  await audit({
    organizationId: voter.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: input.flagged ? "VOTER_FLAGGED" : "VOTER_UNFLAGGED",
    resource: "voter", resourceId: voter.id,
    details: { identifier: voter.identifier, reason: input.flaggedReason },
  });

  return ok({ voter: { id: updated.id, flagged: updated.flagged, flaggedReason: updated.flaggedReason } });
});
