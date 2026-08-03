import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const where = member.role === "PLATFORM_ADMIN" ? {} : { organizationId: member.organizationId };
  const incidents = await db.electionIncident.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { election: { select: { name: true } } },
  });
  return ok({ incidents });
});

const updateSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]).optional(),
  resolution: z.string().max(2000).optional(),
});

export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  const body = await req.json().catch(() => ({}));
  const id = (body as { id?: string }).id;
  if (!id) throw new HttpError("VALIDATION", "Incident id required", 400);
  const input = updateSchema.parse(body);
  const incident = await db.electionIncident.findUnique({ where: { id } });
  if (!incident) throw new HttpError("NOT_FOUND", "Incident not found", 404);
  if (member.role !== "PLATFORM_ADMIN" && incident.organizationId !== member.organizationId) {
    throw new HttpError("FORBIDDEN", "Not your incident", 403);
  }
  const updated = await db.electionIncident.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status, resolvedAt: input.status === "RESOLVED" || input.status === "DISMISSED" ? new Date() : null }),
      ...(input.resolution !== undefined && { resolution: input.resolution }),
    },
  });
  return ok({ incident: updated });
});
