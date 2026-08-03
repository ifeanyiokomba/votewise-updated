import { db } from "@/lib/db";
import { requireOfficial, HttpError } from "@/lib/guards";
import { api, parseBody, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const org = await db.organization.findUnique({
    where: { id: member.organizationId },
    select: { id: true, name: true, subdomain: true, customDomain: true, category: true, status: true },
  });
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  return ok({
    organization: org,
    subdomainUrl: `${org.subdomain}.votewise.com.ng`,
    customDomainUrl: org.customDomain ?? null,
  });
});

const updateSchema = z.object({
  customDomain: z.string().min(3).max(200).regex(/^[a-z0-9.-]+$/i, "Invalid domain format").optional().nullable(),
});

export const PATCH = api(async (req) => {
  const member = await requireOfficial();
  if (!["ORG_OWNER", "ORG_ADMIN", "PLATFORM_ADMIN"].includes(member.role)) {
    throw new HttpError("FORBIDDEN", "Insufficient role", 403);
  }
  const input = await updateSchema.parse(await req.json().catch(() => ({})));

  // Check if domain is taken by another org
  if (input.customDomain) {
    const existing = await db.organization.findFirst({
      where: { customDomain: input.customDomain, NOT: { id: member.organizationId } },
    });
    if (existing) throw new HttpError("CONFLICT", "Domain already claimed by another organization", 409);
  }

  const updated = await db.organization.update({
    where: { id: member.organizationId },
    data: { customDomain: input.customDomain ?? null },
  });

  await audit({
    organizationId: member.organizationId, actorId: member.id, actorRole: member.role, actorName: member.name,
    action: "CUSTOM_DOMAIN_UPDATED", resource: "organization", resourceId: member.organizationId,
    details: { customDomain: updated.customDomain },
  });

  return ok({ organization: { id: updated.id, customDomain: updated.customDomain } });
});
