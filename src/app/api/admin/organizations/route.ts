import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/guards";
import { api, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = api(async () => {
  await requirePlatformAdmin();
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, subdomain: true, category: true, status: true, plan: true, createdAt: true,
      _count: { select: { elections: true, voters: true, members: true } },
    },
  });
  return ok({ organizations: orgs });
});
