/**
 * SVE secrets — loaded once at boot. No hardcoded fallbacks in production.
 * In dev (NODE_ENV !== 'production') a deterministic dev key is derived so the
 * sandbox works without env vars.
 */
const DEV_MARKER = "votewise-dev-do-not-use-in-production-";

function deriveDevKey(label: string, len: number): string {
  // deterministic, length-stable, obviously-not-secret
  let out = DEV_MARKER + label + "-";
  while (out.length < len) out += label;
  return out.slice(0, len);
}

function requireSecret(name: string, minLen: number): string {
  const v = process.env[name];
  const isProd = process.env.NODE_ENV === "production";

  if (v && v.length >= minLen) return v;

  if (isProd) {
    // Fail loud — never boot prod with missing/short secrets.
    throw new Error(
      `[VoteWise] Missing or too-short secret "${name}" (need >= ${minLen} chars). ` +
        `Set it in your secret manager before starting in production.`
    );
  }
  return deriveDevKey(name, minLen);
}

export const SVE_SECRETS = {
  voteEncKey: requireSecret("VOTE_ENC_KEY", 32),
  voterHashPepper: requireSecret("VOTER_HASH_PEPPER", 32),
  hmacSecret: requireSecret("HMAC_SECRET", 32),
  ballotPepper: requireSecret("SVE_BALLOT_PEPPER", 32),
  voterPepper: requireSecret("SVE_VOTER_PEPPER", 32),
  jwtAccessSecret: requireSecret("JWT_ACCESS_SECRET", 32),
} as const;

export const VOTE_KEY_ID = "v1";

/** Dev-only: returns a 6-digit OTP. In production OTPs are random. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
