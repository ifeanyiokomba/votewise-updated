import { db } from "@/lib/db";
import { requireOfficial } from "@/lib/guards";
import { api, ok } from "@/lib/api";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const GENESIS = "GENESIS-votewise-v2";

export const GET = api(async (req) => {
  const member = await requireOfficial();
  const orgId = member.role === "PLATFORM_ADMIN" ? undefined : member.organizationId;

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const action = url.searchParams.get("action"); // filter by action type
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);

  const where: Record<string, unknown> = {};
  if (orgId) where.organizationId = orgId;
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { actorName: { contains: search } },
      { resource: { contains: search } },
      { details: { contains: search } },
    ];
  }
  if (action) where.action = action;

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, organizationId: true, actorId: true, actorRole: true, actorName: true,
      action: true, resource: true, resourceId: true, details: true,
      prevHash: true, hash: true, nonce: true, ipAddress: true, createdAt: true,
    },
  });

  // Verify chain integrity
  const allLogs = await db.auditLog.findMany({
    where: orgId ? { organizationId: orgId } : {},
    orderBy: { createdAt: "asc" },
    select: { hash: true, prevHash: true, actorId: true, action: true, details: true, createdAt: true, nonce: true },
  });

  let chainIntact = true;
  let brokenAt: string | null = null;
  let brokenReason: string | null = null;
  let prev: string | null = null;
  let verifiedCount = 0;

  for (const log of allLogs) {
    if (log.prevHash !== prev) {
      chainIntact = false;
      brokenAt = log.hash;
      brokenReason = `Expected prevHash ${prev?.slice(0, 12) ?? "null"}… but got ${log.prevHash?.slice(0, 12) ?? "null"}…`;
      break;
    }
    const details = log.details ?? "";
    const recomputed = createHash("sha256")
      .update([log.prevHash ?? GENESIS, log.actorId ?? "", log.action, details, log.createdAt.toISOString(), log.nonce].join("|"))
      .digest("hex");
    if (recomputed !== log.hash) {
      chainIntact = false;
      brokenAt = log.hash;
      brokenReason = "Hash mismatch — entry may have been tampered with";
      break;
    }
    prev = log.hash;
    verifiedCount++;
  }

  // Get unique actions for filter dropdown
  const actions = await db.auditLog.findMany({
    where: orgId ? { organizationId: orgId } : {},
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return ok({
    logs,
    chain: {
      intact: chainIntact,
      brokenAt,
      brokenReason,
      totalEntries: allLogs.length,
      verifiedCount,
    },
    availableActions: actions.map((a) => a.action),
  });
});
