import { db } from "@/lib/db";
import type { Organization } from "@prisma/client";
import {
  extractTenantSlug,
  isPlatformDomain,
  normalizeHostname,
  validateSubdomainSlug,
} from "@/lib/tenant-utils";

/**
 * Multi-tenant resolution. Per Section 3.3 + 3.4 of the Multi-Tenant Directive:
 *
 *   1. Read trusted request hostname
 *   2. Normalize (lowercase, strip port)
 *   3. Check if platform-reserved domain → return null (public website)
 *   4. If tenant subdomain, extract slug
 *   5. Validate slug against reserved list
 *   6. Resolve tenant from database
 *   7. Confirm tenant is active
 *   8. Return tenant context
 *
 * Also supports:
 *   - Custom domain lookup (Section 4)
 *   - Dev/platform-admin override via x-vw-org header
 *
 * Cached per-instance for 30s (keyed by hostname/subdomain).
 */

type CachedOrg = { org: Organization | null; at: number };
const cache = new Map<string, CachedOrg>();
const TTL = 30_000;

export async function resolveOrganization(req: Request): Promise<Organization | null> {
  // 1. explicit override (dev / platform-admin only)
  const url = new URL(req.url);
  const override = url.searchParams.get("x-vw-org") ?? req.headers.get("x-vw-org");
  if (override) {
    // Validate the override slug too
    const slugError = validateSubdomainSlug(override);
    if (slugError) return null; // don't resolve invalid/reserved slugs
    const cached = cache.get(override);
    if (cached && Date.now() - cached.at < TTL) return cached.org;
    const org = await db.organization.findUnique({ where: { subdomain: override } });
    cache.set(override, { org, at: Date.now() });
    return org;
  }

  // 2. host → custom domain or subdomain
  const rawHost = req.headers.get("host") ?? "";
  if (!rawHost) return null;

  const host = normalizeHostname(rawHost);

  // 3. Check if platform-reserved domain → public website
  if (isPlatformDomain(host)) return null;

  const cached = cache.get(host);
  if (cached && Date.now() - cached.at < TTL) return cached.org;

  let org: Organization | null = null;

  // 4. Try custom domain lookup first
  org = await db.organization.findUnique({ where: { customDomain: host } });

  // 5. If not custom domain, try tenant subdomain extraction
  if (!org) {
    const slug = extractTenantSlug(host);
    if (slug) {
      // slug is already validated against reserved list by extractTenantSlug
      org = await db.organization.findUnique({ where: { subdomain: slug } });
    }
  }

  // 6. Verify tenant is active (not suspended/archived/deleted)
  if (org && !["ACTIVE", "ONBOARDING", "PAST_DUE"].includes(org.status)) {
    // Suspended/restricted/deleted tenants — don't serve content
    cache.set(host, { org: null, at: Date.now() });
    return null;
  }

  cache.set(host, { org, at: Date.now() });
  return org;
}

/** For org-scoped route segments like /o/[subdomain] */
export async function resolveOrgBySubdomain(subdomain: string): Promise<Organization | null> {
  // Validate slug against reserved list
  const slugError = validateSubdomainSlug(subdomain);
  if (slugError) return null;

  const cached = cache.get(subdomain);
  if (cached && Date.now() - cached.at < TTL) return cached.org;
  const org = await db.organization.findUnique({ where: { subdomain } });

  // Verify tenant is active
  if (org && !["ACTIVE", "ONBOARDING", "PAST_DUE"].includes(org.status)) {
    cache.set(subdomain, { org: null, at: Date.now() });
    return null;
  }

  cache.set(subdomain, { org, at: Date.now() });
  return org;
}

export function requireOrg(org: Organization | null): Organization {
  if (!org) {
    const err = new Error("Organization not found");
    (err as any).statusCode = 404;
    (err as any).code = "NOT_FOUND";
    throw err;
  }
  return org;
}
