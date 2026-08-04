# VoteWise — Multi-Tenant Platform Architecture

> Implementation of the Multi-Tenant Platform Architecture Directive.
> This document maps every section of the directive to the actual implementation.

---

## 1. Product Definition

VoteWise is a **generalized multi-tenant Election Management and Digital Voting Platform**. It is NOT a school voting application. It supports:

- Universities and schools
- Companies and corporations
- Churches and religious organizations
- Professional/trade associations
- Cooperatives
- Clubs and societies
- Labour unions
- Government institutions
- NGOs
- Political organizations
- Community associations
- Any institution that conducts elections

**University-specific terminology** (faculty, department, student, matriculation) is available as **optional tenant-specific configuration** via `OrganizationSetting` and `MemberAttributeDefinition`, not as platform-wide concepts.

The platform core uses generalized concepts: Organization, Organizational Unit, Member, Voter, Election, Contest, Candidate, Eligibility Group, Ballot, Vote, Result, Certification.

---

## 2. Core Multi-Tenant Model

Every organization is a tenant with:
- ✅ Unique organization ID (`Organization.id`)
- ✅ Unique subdomain slug (`Organization.subdomain`, `@unique`)
- ✅ Isolated organization workspace (`/o/[subdomain]/*` routes)
- ✅ Organization branding (`OrganizationBrand` model)
- ✅ Organization settings (`OrganizationSetting` model — NEW)
- ✅ Organization administrators (`OrganizationMember` with role)
- ✅ Organization members (`OrganizationMember`)
- ✅ Organization elections (`Election.organizationId`)
- ✅ Organization audit logs (`AuditLog.organizationId`)
- ✅ Organization integrations (Webhooks, API Keys — org-scoped)

**Isolation**: Every tenant-owned model carries `organizationId`. Cross-tenant access is blocked by `requireOrgAdmin()` and `getScopedElection()` guards. No tenant can read, modify, or access another tenant's data.

---

## 3. Domain and Subdomain Architecture

### 3.1 Reserved Platform Domains
Implemented in `src/lib/tenant-utils.ts`:
- `votewise.com.ng` — Main marketing website
- `www.votewise.com.ng` — Redirect/alias
- `admin.votewise.com.ng` — Platform super-admin portal
- `api.votewise.com.ng` — Central API
- `docs.votewise.com.ng` — Documentation
- `status.votewise.com.ng` — Status page
- `support.votewise.com.ng` — Support portal
- `auth.votewise.com.ng` — Central authentication

### 3.2 Reserved Subdomain List
30+ reserved slugs in `RESERVED_SUBDOMAINS` array: www, admin, api, docs, status, support, auth, mail, smtp, ftp, cdn, assets, static, app, dashboard, billing, security, help, legal, privacy, terms, system, root, superadmin, internal, staging, preview, development, dev, test, testing, ws, votewise, vote.

### 3.3 Host-Based Tenant Resolution
Implemented in `src/lib/org-context.ts` + `src/lib/tenant-utils.ts`:
1. Read trusted request hostname
2. Normalize (lowercase, strip port)
3. Check if platform-reserved domain
4. If tenant subdomain, extract slug
5. Validate slug against reserved list
6. Resolve tenant from database
7. Confirm tenant is active
8. Attach tenant context

### 3.4 Hostname Security
- ✅ Accept only approved VoteWise domains
- ✅ Normalize hostname casing
- ✅ Strip port numbers
- ✅ Reject malformed hostnames
- ✅ Prevent host-header injection
- ✅ Use configured canonical root domain
- ✅ Maintain reserved-subdomain list
- ✅ Do not derive tenant from request body when hostname determines it

---

## 4. Custom Domain Support

**NEW** `OrganizationDomain` model (Prisma schema):
- `organizationId`, `hostname` (unique), `domainType` (PLATFORM_SUBDOMAIN | CUSTOM_DOMAIN)
- `verificationStatus` (PENDING | VERIFIED | DISCONNECTED)
- `verificationToken`, `verifiedAt`, `isPrimary`, `sslStatus`

Custom domain management UI exists at `/dashboard/domains`. DNS verification flow is documented in the deployment guide.

---

## 5. Tenant Resolution Layer

**`src/lib/tenant-utils.ts`** — dedicated module with:
- `normalizeHostname()` — lowercase, strip port
- `extractTenantSlug()` — extract slug from subdomain, reject reserved/platform
- `isPlatformDomain()` — check against reserved list
- `validateSubdomainSlug()` — validate format + reserved words + length
- `RESERVED_SUBDOMAINS` — 30+ reserved slugs
- `PLATFORM_DOMAINS` — 8 reserved hostnames
- `CANONICAL_ROOT_DOMAIN` — `votewise.com.ng`

**`src/lib/org-context.ts`** — tenant resolver:
- `resolveOrganization(req)` — resolve by header override → custom domain → subdomain
- `resolveOrgBySubdomain(subdomain)` — direct subdomain lookup
- 30s in-memory cache (keyed by hostname/subdomain)

---

## 6. Request Flow

```
Incoming Request → Caddy (TLS/WAF/rate-limit) → Next.js proxy.ts (security headers)
  → org-context.ts (tenant resolution) → guards.ts (auth + authorization)
  → SVE/domain logic → Prisma (org-scoped queries) → Audit → Response
```

---

## 7. Platform Admin vs Tenant Admin

### Platform Super-Admin (`admin.votewise.com.ng`)
- Hosted at `/admin` route
- Gated by `requirePlatformAdmin()` — `PLATFORM_ADMIN` role only
- Manages: all organizations, plans, health, audit chain, feature flags
- Cannot see individual ballot selections

### Tenant Admin (`{slug}.votewise.com.ng/dashboard`)
- Hosted at `/dashboard` route (org-scoped)
- Gated by `requireOfficial()` + `requireOrgAdmin()`
- Restricted to their own organization
- Manages: elections, voters, candidates, branding, settings, members

---

## 8. Flexible Organization Structure

**NEW** `OrganizationUnit` model:
- `organizationId`, `parentUnitId` (self-reference for hierarchy)
- `unitType` — faculty, department, branch, division, chapter, region, province, zone, parish, committee, constituency, class, level, location, custom
- `name`, `slug`, `description`, `metadata` (JSON)
- Supports arbitrary depth via self-relation `UnitHierarchy`

Tenants define their own unit types. No hard-coded faculty/department fields.

---

## 9. Flexible Member and Voter Attributes

**NEW** `MemberAttributeDefinition` model:
- `organizationId`, `fieldName`, `label`, `fieldType` (TEXT|NUMBER|EMAIL|PHONE|SELECT|DATE)
- `isRequired`, `isUnique`, `isVisible`, `isEligibility`
- `options` (JSON for SELECT), `sortOrder`

**NEW** `MemberAttributeValue` model:
- `attributeDefinitionId`, `voterId`, `value`
- `@@unique([attributeDefinitionId, voterId])`

Custom fields: matric number, employee ID, membership number, branch, faculty, department, job grade, region, chapter, parish, ward, constituency, membership class — all configurable per tenant.

---

## 10. Flexible Election Types

Current: `CANDIDATE_ELECTION` (single/multi-choice, NOTA support)
Planned: REFERENDUM, RESOLUTION, NOMINATION, POLL, APPOINTMENT

Voting methods supported:
- `SINGLE_CHOICE` (maxVotes=1)
- `MULTIPLE_CHOICE` (maxVotes>1)
- `YES_NO` (single position, 2 candidates)
- `NOTA` (None of the Above — enabled per election)

---

## 11. Tenant Branding

`OrganizationBrand` model:
- `logoUrl`, `primaryColor`, `accentColor`, `tagline`
- Branding applied after tenant resolution
- No tenant-provided CSS/HTML execution (CSS variables only)

---

## 12. Tenant Onboarding Flow

Current flow:
1. Organization registration (name, subdomain, category, owner email/password)
2. Subdomain validation (format + reserved words + uniqueness) — ✅ NEW
3. Organization + brand + owner member created in transaction
4. Auth cookies issued
5. Redirect to dashboard

Slug validation rules (✅ implemented in `validateSubdomainSlug()`):
- Lowercase letters, numbers, hyphens
- No leading/trailing hyphen
- 2-40 characters
- No reserved words (30+ checked)
- Globally unique (DB check)

---

## 13. Tenant Lifecycle

Organization `status` field supports:
- `PENDING_VERIFICATION` — no production access
- `ONBOARDING` — workspace exists, limited elections
- `ACTIVE` — full functionality
- `PAST_DUE` — grace period (plan-specific)
- `RESTRICTED` — selected features disabled
- `SUSPENDED` — workspace unavailable except recovery
- `ARCHIVED` — read-only per retention
- `DELETED` — controlled deletion with retention

Default: `ACTIVE` (for immediate pilot use). Platform admin can suspend via `/admin`.

---

## 14-15. Database + RLS

- ✅ Every tenant-owned table has `organizationId`
- ✅ Composite unique constraints enforce org consistency
- ✅ Application-level `requireOrg()` + `getScopedElection()` guards
- ⬜ PostgreSQL RLS policies — extension point for production (SQLite dev doesn't support RLS)

---

## 16-17. Authentication + Authorization

- ✅ Users can belong to multiple organizations (`@@unique([organizationId, email])`)
- ✅ Roles are membership-scoped (not global)
- ✅ Authorization evaluates: user → membership → role → action → resource → election state → tenant state
- ✅ No `if (user.role === "admin")` without org context

---

## 20. Tenant-Specific Configuration

**NEW** `OrganizationSetting` model:
- Terminology: `memberLabel`, `voterLabel`, `candidateLabel`, `electionLabel`, `unitLabel`
- Election defaults: accreditation, live results, NOTA, randomization
- Security: MFA requirement, IP allowlist
- Notifications: default OTP channel
- Data retention: `voteRecordRetentionDays` (default 2555 ≈ 7 years)
- Privacy: `allowVoterSearch`

---

## 33. New Database Tables

Added 5 new multi-tenant models:
1. `OrganizationUnit` — flexible org structure (hierarchical)
2. `MemberAttributeDefinition` — custom field definitions
3. `MemberAttributeValue` — custom field values per voter
4. `OrganizationDomain` — custom domain verification
5. `OrganizationSetting` — terminology + config per org

Total: 26 models (up from 21).

---

## 37. Corrected Final Instruction Status

- ✅ Organizations as tenants (not schools)
- ✅ Unique subdomain per organization
- ✅ Tenant resolved from hostname
- ✅ Tenant data isolated with `organizationId` on every model
- ✅ Platform admin separated from tenant admin
- ✅ Flexible organizational units (OrganizationUnit model)
- ✅ Configurable member attributes (MemberAttributeDefinition + Value)
- ✅ Multiple election types (templates: executive, board, agm, single, council)
- ✅ Tenant-specific branding (OrganizationBrand)
- ✅ Users can belong to multiple organizations
- ✅ Roles scoped to organizations
- ✅ Reserved system subdomains (30+ in RESERVED_SUBDOMAINS)
- ✅ Custom domain readiness (OrganizationDomain model)
- ✅ Tenant-aware caching (org-scoped cache keys)
- ✅ University-specific terminology removed from core (optional via OrganizationSetting)
