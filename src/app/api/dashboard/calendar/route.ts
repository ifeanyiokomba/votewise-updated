import { db } from "@/lib/db";
import { requireOfficial } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const orgId = member.role === "PLATFORM_ADMIN" ? undefined : member.organizationId;

  const elections = await db.election.findMany({
    where: orgId ? { organizationId: orgId } : {},
    orderBy: { startTime: "asc" },
    select: {
      id: true, name: true, status: true, startTime: true, endTime: true,
      organization: orgId ? undefined : { select: { name: true, subdomain: true } },
      _count: { select: { votes: { where: { isSimulation: false } } } },
    },
  });

  return ok({
    elections: elections.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      votes: e._count.votes,
      ...(e.organization ? { orgName: e.organization.name, orgSubdomain: e.organization.subdomain } : {}),
    })),
  });
});
