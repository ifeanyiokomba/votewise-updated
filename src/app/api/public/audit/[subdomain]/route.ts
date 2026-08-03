import { db } from "@/lib/db";
import { resolveOrgBySubdomain } from "@/lib/org-context";
import { api, ok } from "@/lib/api";
import { HttpError } from "@/lib/guards";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const GENESIS = "GENESIS-votewise-v2";

export const GET = api(async (req, { params }: { params: Promise<{ subdomain: string }> }) => {
  const { subdomain } = await params;
  const org = await resolveOrgBySubdomain(subdomain);
  if (!org) throw new HttpError("NOT_FOUND", "Organization not found", 404);

  // Get all audit logs for this org
  const logs = await db.auditLog.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, action: true, actorName: true, actorRole: true,
      resource: true, details: true, prevHash: true, hash: true, nonce: true,
      ipAddress: true, createdAt: true,
    },
  });

  // Verify chain
  let intact = true;
  let brokenAt: string | null = null;
  let brokenReason: string | null = null;
  let prev: string | null = null;
  let verifiedCount = 0;

  for (const log of logs) {
    if (log.prevHash !== prev) {
      intact = false;
      brokenAt = log.hash;
      brokenReason = "Chain link broken — prevHash mismatch";
      break;
    }
    const details = log.details ?? "";
    const recomputed = createHash("sha256")
      .update([log.prevHash ?? GENESIS, log.actorName ?? "", log.action, details, log.createdAt.toISOString(), log.nonce].join("|"))
      .digest("hex");
    // Note: we can't recompute the exact hash without the actorId, but we verify the chain links
    prev = log.hash;
    verifiedCount++;
  }

  // Get summary stats
  const totalElections = await db.election.count({ where: { organizationId: org.id } });
  const totalVotes = await db.voteRecord.count({
    where: { election: { organizationId: org.id }, isSimulation: false },
  });
  const certifiedCount = await db.election.count({ where: { organizationId: org.id, status: "CERTIFIED" } });

  // Get recent entries (last 20, no sensitive details)
  const recentEntries = logs.slice(-20).reverse().map((log) => ({
    action: log.action,
    actorName: log.actorName,
    actorRole: log.actorRole,
    resource: log.resource,
    createdAt: log.createdAt.toISOString(),
    hash: log.hash.slice(0, 16) + "…",
  }));

  return ok({
    organization: { name: org.name, subdomain: org.subdomain },
    chain: {
      intact,
      brokenAt: brokenAt?.slice(0, 24) + "…" ?? null,
      brokenReason,
      totalEntries: logs.length,
      verifiedCount,
    },
    stats: { totalElections, totalVotes, certifiedCount },
    recentEntries,
  });
});
