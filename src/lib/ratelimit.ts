/**
 * Rate limiting — in-memory token bucket in the sandbox, Redis-ready interface.
 * The prototype's per-instance limiter was a multi-replica bug; this keeps the
 * simple interface so a Redis swap is a one-file change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// periodic cleanup to avoid unbounded growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, 60_000).unref?.();
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Consume one token from the bucket. Returns ok=false if exceeded.
 * @param key  e.g. `login:ip:1.2.3.4`
 * @param max  max requests in window
 * @param windowMs window in ms
 */
export function consume(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }
  if (existing.count >= max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

/* ---- named buckets ---- */
export const RATE_LIMITS = {
  login: (ip: string) => consume(`login:ip:${ip}`, 10, 60_000),
  sendOtp: (identifier: string) => consume(`otp:id:${identifier}`, 1, 60_000),
  verifyOtp: (ip: string) => consume(`verify:ip:${ip}`, 10, 60_000),
  voteCast: (voterId: string) => consume(`vote:voter:${voterId}`, 3, 60_000),
  publicRead: (ip: string) => consume(`read:ip:${ip}`, 200, 60_000),
  publicWrite: (ip: string) => consume(`write:ip:${ip}`, 30, 60_000),
} as const;

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
