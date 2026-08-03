import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, ok } from "@/lib/api";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  const org = await resolveOrgBySubdomain(subdomain);
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const now = new Date();
  const announcements = await db.announcement.findMany({
    where: {
      organizationId: org.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      publishedAt: true,
      electionId: true,
      election: { select: { name: true } },
    },
  });

  return ok({ announcements });
});
