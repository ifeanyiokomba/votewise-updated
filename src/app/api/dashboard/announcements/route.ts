import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const where = member.role === "PLATFORM_ADMIN" ? {} : { organizationId: member.organizationId };
  const announcements = await db.announcement.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { election: { select: { name: true } } },
  });
  return ok({ announcements });
});

const createSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(5).max(5000),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("INFO"),
  electionId: z.string().optional(),
});

export const POST = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  const input = await parseBody(req, createSchema);
  const announcement = await db.announcement.create({
    data: {
      organizationId: member.organizationId,
      electionId: input.electionId,
      title: input.title,
      body: input.body,
      severity: input.severity,
    },
  });
  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "ANNOUNCEMENT_PUBLISHED", resource: "announcement", resourceId: announcement.id,
    details: { title: input.title, severity: input.severity },
  });
  return ok({ announcement });
});
