/**
 * Reserved subdomain slugs — cannot be used by organizations.
 * Per Section 3.1 of the Multi-Tenant Architecture Directive.
 */
export const RESERVED_SUBDOMAINS = [
  "www",
  "admin",
  "api",
  "docs",
  "status",
  "support",
  "auth",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "assets",
  "static",
  "app",
  "dashboard",
  "billing",
  "security",
  "help",
  "legal",
  "privacy",
  "terms",
  "system",
  "root",
  "superadmin",
  "internal",
  "staging",
  "preview",
  "development",
  "dev",
  "test",
  "testing",
  "ws",
  "votewise",
  "vote",
  "votewise-app",
] as const;

/** Reserved platform domains */
export const PLATFORM_DOMAINS = [
  "votewise.com.ng",
  "www.votewise.com.ng",
  "admin.votewise.com.ng",
  "api.votewise.com.ng",
  "docs.votewise.com.ng",
  "status.votewise.com.ng",
  "support.votewise.com.ng",
  "auth.votewise.com.ng",
] as const;

/** Canonical root domain */
export const CANONICAL_ROOT_DOMAIN = "votewise.com.ng";

/**
 * Validate a subdomain slug per the rules in Section 12.
 * Returns an error message if invalid, null if valid.
 */
export function validateSubdomainSlug(slug: string): string | null {
  if (!slug) return "Subdomain is required";
  if (slug.length < 2) return "Subdomain must be at least 2 characters";
  if (slug.length > 40) return "Subdomain must be at most 40 characters";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Subdomain must contain only lowercase letters, numbers, and hyphens";
  if (slug.startsWith("-")) return "Subdomain cannot start with a hyphen";
  if (slug.endsWith("-")) return "Subdomain cannot end with a hyphen";
  if (RESERVED_SUBDOMAINS.includes(slug as typeof RESERVED_SUBDOMAINS[number])) {
    return "This subdomain is reserved and cannot be used";
  }
  return null;
}

/**
 * Check if a hostname is a reserved platform domain.
 */
export function isPlatformDomain(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/:\d+$/, "");
  return PLATFORM_DOMAINS.includes(normalized as typeof PLATFORM_DOMAINS[number]);
}

/**
 * Extract the tenant slug from a hostname.
 * Returns null for platform domains, "www", or unresolvable hosts.
 */
export function extractTenantSlug(hostname: string): string | null {
  const normalized = hostname.toLowerCase().replace(/:\d+$/, "");

  // Platform domains — not tenant subdomains
  if (isPlatformDomain(normalized)) return null;

  // Extract first label from subdomain
  const parts = normalized.split(".");
  if (parts.length < 3) return null; // e.g. "votewise.com.ng" (2 parts after stripping)

  const slug = parts[0]!;
  if (!slug || slug === "www" || RESERVED_SUBDOMAINS.includes(slug as typeof RESERVED_SUBDOMAINS[number])) {
    return null;
  }

  // Verify it ends with the canonical root domain
  const rootPart = parts.slice(1).join(".");
  if (rootPart !== CANONICAL_ROOT_DOMAIN) return null;

  return slug;
}

/**
 * Normalize a hostname: lowercase, strip port, validate format.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().trim().replace(/:\d+$/, "");
}
