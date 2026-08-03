import { db } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { HttpError } from "@/lib/guards";

export const dynamic = "force-dynamic";

export const GET = api(async (_req, { params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  const org = await db.organization.findUnique({
    where: { subdomain },
    include: { brand: true },
  });
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  const elections = await db.election.findMany({
    where: { organizationId: org.id, status: { in: ["SCHEDULED", "LIVE", "CLOSED", "CERTIFIED"] } },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      visibility: true,
      startTime: true,
      endTime: true,
      showLiveResults: true,
      hideResultsUntilEnd: true,
    },
  });

  // org-scoped vote count (fixes the prototype's global-leak bug)
  const voteCount = await db.voteRecord.count({
    where: { election: { organizationId: org.id }, isSimulation: false },
  });
  const voterCount = await db.voter.count({ where: { organizationId: org.id } });

  return ok({
    organization: {
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
      category: org.category,
      tagline: org.brand?.tagline ?? "Secure elections, verified results.",
      logoUrl: org.brand?.logoUrl ?? null,
    },
    stats: { totalVotes: voteCount, totalVoters: voterCount, electionsCount: elections.length },
    elections,
  });
});
