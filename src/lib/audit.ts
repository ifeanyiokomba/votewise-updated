import { db } from "@/lib/db";
import { SVE_SECRETS } from "@/lib/secrets";
import { createHash } from "crypto";

const GENESIS = "GENESIS-votewise-v2";

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function randomNonce(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface AuditInput {
  organizationId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Hash-chained audit log. `prevHash` is read inside the same transaction
 * the caller is using (via db.$transaction) to prevent the chain-fork race
 * the prototype suffered.
 *
 * Usage:
 *   await db.$transaction(async (tx) => {
 *     // ... do mutation ...
 *     await writeAudit(tx, { ... });
 *   });
 */
export async function writeAudit(
  tx: typeof db,
  input: AuditInput
): Promise<{ hash: string; prevHash: string | null }> {
  // last hash inside this transaction
  const last = await tx.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });
  const prevHash = last?.hash ?? null;
  const nonce = randomNonce();
  const createdAt = new Date().toISOString();
  const details = input.details ? JSON.stringify(input.details) : null;
  const hash = sha256([prevHash ?? GENESIS, input.actorId ?? "", input.action, details ?? "", createdAt, nonce].join("|"));

  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      actorName: input.actorName ?? null,
      action: input.action,
      resource: input.resource ?? null,
      resourceId: input.resourceId ?? null,
      details,
      prevHash,
      hash,
      nonce,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return { hash, prevHash };
}

/** Convenience wrapper for non-transactional audits (uses db directly). */
export async function audit(input: AuditInput) {
  return writeAudit(db, input);
}

/** Verify the integrity of the chain. Returns the first broken link, or null if intact. */
export async function verifyAuditChain(organizationId?: string) {
  const where = organizationId ? { organizationId } : {};
  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: { hash: true, prevHash: true, actorId: true, action: true, details: true, createdAt: true, nonce: true },
  });
  let prev: string | null = null;
  for (const log of logs) {
    const expectedPrev = prev;
    if (log.prevHash !== expectedPrev) {
      return { intact: false, brokenAt: log.hash, expectedPrev, actualPrev: log.prevHash };
    }
    const details = log.details ?? "";
    const recomputed = sha256([log.prevHash ?? GENESIS, log.actorId ?? "", log.action, details, log.createdAt.toISOString(), log.nonce].join("|"));
    if (recomputed !== log.hash) {
      return { intact: false, brokenAt: log.hash, reason: "hash_mismatch" };
    }
    prev = log.hash;
  }
  return { intact: true, count: logs.length };
}

export { GENESIS };
