import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { verifyAuditChain } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = api(async (req) => {
  await requirePlatformAdmin();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, organizationId: true, actorName: true, actorRole: true, action: true,
      resource: true, resourceId: true, details: true, createdAt: true, hash: true, prevHash: true,
    },
  });
  const chain = await verifyAuditChain();
  return ok({ logs, chain });
});
