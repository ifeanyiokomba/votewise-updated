import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, ok } from "@/lib/api";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (req, { params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  const org = await resolveOrgBySubdomain(subdomain);
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const elections = await db.election.findMany({
    where: { organizationId: org.id, status: { in: ["CERTIFIED", "CLOSED", "ARCHIVED"] } },
    orderBy: { endTime: "desc" },
    select: {
      id: true, name: true, description: true, status: true,
      startTime: true, endTime: true, certifiedAt: true,
      verification: { select: { totalVotes: true, totalEligible: true, turnoutPct: true, auditHash: true } },
      _count: { select: { votes: { where: { isSimulation: false } }, positions: true } },
    },
  });

  return ok({ elections });
});
