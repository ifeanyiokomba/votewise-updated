import { db } from "@/lib/db";
import type { Organization } from "@prisma/client";

/**
 * Multi-tenant resolution. Order:
 *   1. ?x-vw-org= / x-vw-org header  (dev / platform-admin override)
 *   2. custom domain lookup
 *   3. subdomain from host
 *   4. null (public website)
 *
 * Cached per-instance for 30s to avoid a DB hit on every request.
 */

type CachedOrg = { org: Organization | null; at: number };
const cache = new Map<string, CachedOrg>();
const TTL = 30_000;

function extractSubdomain(host: string): string | null {
  // strip port
  const h = host.split(":")[0]!;
  // localhost / ip → no subdomain
  if (/^localhost$|^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  const parts = h.split(".");
  // foo.votewise.com.ng → foo ; a.b.votewise.com.ng → a (first label)
  if (parts.length >= 3) return parts[0]!;
  return null;
}

export async function resolveOrganization(req: Request): Promise<Organization | null> {
  // 1. explicit override
  const url = new URL(req.url);
  const override = url.searchParams.get("x-vw-org") ?? req.headers.get("x-vw-org");
  if (override) {
    const cached = cache.get(override);
    if (cached && Date.now() - cached.at < TTL) return cached.org;
    const org = await db.organization.findUnique({ where: { subdomain: override } });
    cache.set(override, { org, at: Date.now() });
    return org;
  }

  // 2. host → custom domain or subdomain
  const host = req.headers.get("host") ?? "";
  if (!host) return null;

  const cached = cache.get(host);
  if (cached && Date.now() - cached.at < TTL) return cached.org;

  let org: Organization | null = null;
  // custom domain
  org = await db.organization.findUnique({ where: { customDomain: host } });
  if (!org) {
    const sub = extractSubdomain(host);
    if (sub && sub !== "www" && sub !== "admin") {
      org = await db.organization.findUnique({ where: { subdomain: sub } });
    }
  }
  cache.set(host, { org, at: Date.now() });
  return org;
}

/** For org-scoped route segments like /o/[subdomain] */
export async function resolveOrgBySubdomain(subdomain: string): Promise<Organization | null> {
  const cached = cache.get(subdomain);
  if (cached && Date.now() - cached.at < TTL) return cached.org;
  const org = await db.organization.findUnique({ where: { subdomain } });
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
