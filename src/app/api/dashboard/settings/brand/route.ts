import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const brand = await db.organizationBrand.findUnique({ where: { organizationId: member.organizationId } });
  return ok({ brand });
});

const updateSchema = z.object({
  tagline: z.string().max(200).optional(),
  primaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  logoUrl: z.string().url().optional(),
});

export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  const input = await updateSchema.parse(await req.json().catch(() => ({})));
  const data: Record<string, unknown> = {};
  if (input.tagline !== undefined) data.tagline = input.tagline;
  if (input.primaryColor !== undefined) data.primaryColor = input.primaryColor;
  if (input.accentColor !== undefined) data.accentColor = input.accentColor;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;

  const brand = await db.organizationBrand.upsert({
    where: { organizationId: member.organizationId },
    update: data,
    create: { organizationId: member.organizationId, ...data },
  });
  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "BRAND_UPDATED", resource: "organization", resourceId: member.organizationId,
    details: data,
  });
  return ok({ brand });
});
