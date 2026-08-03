# VoteWise — Implementation Roadmap (Phase 6)

> Milestone-based engineering plan. Each milestone lists objectives, files affected, dependencies,
> testing requirements, acceptance criteria, and a rollback plan. Milestones are sequenced; later
> milestones depend on earlier ones.

---

## Milestone 0 — Foundation & Design System

**Objectives:** Establish the design tokens, fonts, layout shell, and core utilities that every
subsequent screen depends on.

**Files affected:**
- `src/app/globals.css` — OKLCH tokens, a11y modes, utilities (`vw-section`, `vw-card`, `vw-dot`, `vw-stat`, `vw-lift`, `votewise-live-dot`)
- `src/app/layout.tsx` — Geist + Space Grotesk fonts, ThemeProvider (next-themes), Toaster, QueryProvider
- `src/components/theme-provider.tsx`
- `src/components/votewise/primitives/*` — SectionHeader, Eyebrow, Dot, Spinner, EmptyState, ErrorState, Stat
- `src/lib/utils.ts` — `cn`, formatters (formatDateTime, timeAgo, formatNumber — single source)

**Dependencies:** none.

**Testing:**
- Lint passes.
- Light/dark/system toggle works; persisted.
- High-contrast / large-text / reduced-motion toggles apply correct CSS.
- Contrast check: all text ≥ 4.5:1 in both themes.

**Acceptance:**
- Tokens resolve in both themes; no raw hex in components.
- `<SectionHeader>` renders eyebrow + title + subtitle.
- Fonts load with `display: swap`; no layout shift.

**Rollback:** revert `globals.css` + `layout.tsx`; scaffold defaults restore.

---

## Milestone 1 — Database & Domain Lib

**Objectives:** Define the curated Prisma schema, push to SQLite, and build the lib layer (auth,
org-context, validation, audit, rate limit).

**Files affected:**
- `prisma/schema.prisma` — ~25 models (Organization, OrganizationMember, OrganizationBrand,
  Election, Position, Candidate, Voter, VoterEligibility, VoterSession, Ballot, VoteRecord,
  CandidateTally, ElectionVerification, AuditLog, LoginSession, SupportTicket)
- `src/lib/db.ts` — Prisma singleton
- `src/lib/org-context.ts` — `resolveOrganization(req)` (subdomain → header → null)
- `src/lib/auth.ts` — JWT (jose), scrypt password, cookie helpers
- `src/lib/guards.ts` — requireOfficial, requireVoter, requireOrgAdmin, requirePlatformAdmin
- `src/lib/validation.ts` — zod schemas (shared client/server)
- `src/lib/ratelimit.ts` — token bucket, Redis-ready interface
- `src/lib/audit.ts` — hash-chained writeAudit (prevHash inside txn)
- `src/lib/secrets.ts` — requireSecret() for 5 SVE secrets (dev fallback)

**Dependencies:** M0.

**Testing:**
- `bun run db:push` succeeds; tables created.
- `requireSecret()` throws in production if a secret is missing.
- `resolveOrganization()` resolves subdomain correctly from host header.
- zod schemas reject malformed input; accept valid input.

**Acceptance:**
- Prisma Client generates without error.
- A seed script can create an org + member + election.

**Rollback:** `git checkout prisma/schema.prisma && bun run db:push` (destroys dev data only —
acceptable in sandbox).

---

## Milestone 2 — Secure Voting Engine (SVE)

**Objectives:** Implement the cryptographic core: ballot builder, vote recorder, tally, receipt.

**Files affected:**
- `src/lib/sve/crypto.ts` — AES-256-GCM encrypt/decrypt, HMAC-SHA256, scrypt, timingSafeEqual, voterHash
- `src/lib/sve/ballot.ts` — buildBallot (load positions/candidates, seeded shuffle, sign, integrity token)
- `src/lib/sve/vote-recorder.ts` — castVote (8-step validation + atomic $transaction)
- `src/lib/sve/tally.ts` — tallyElection, certifyElection
- `src/lib/sve/receipt.ts` — verifyReceipt (anonymity-preserving field selection)

**Dependencies:** M1.

**Testing:**
- Crypto round-trip: encrypt → decrypt restores plaintext; tampered ciphertext fails auth tag.
- voterHash differs per election for same voter.
- buildBallot produces deterministic order per voter, different across voters.
- castVote: happy path inserts VoteRecord + increments tally + writes audit + revokes session.
- castVote: double-vote → 409 DUPLICATE_VOTE.
- castVote: expired ballot → 400 BALLOT_EXPIRED.
- castVote: election not LIVE → 409 ELECTION_NOT_LIVE.
- Tally invariant: Σ CandidateTally.count == Σ VoteRecord per position.

**Acceptance:**
- All above pass via a seed-driven integration check.
- No `any` in SVE module signatures.

**Rollback:** SVE is additive; disabling vote routes returns 503. DB schema unchanged.

---

## Milestone 3 — Auth & Voter APIs

**Objectives:** Build the authentication surface for both officials and voters.

**Files affected:**
- `src/app/api/auth/register/route.ts` — org + owner signup
- `src/app/api/auth/login/route.ts` — official login (lockout, 2FA hook)
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/voter/send-otp/route.ts` — 60s cooldown, rate limit
- `src/app/api/voter/verify-otp/route.ts` — 5-try lock, issue VoterSession
- `src/app/api/voter/eligibility/route.ts` — public eligibility check
- `src/middleware.ts` — security headers + org resolution hint
- `src/app/api/health/route.ts`

**Dependencies:** M1, M2.

**Testing:**
- Register creates org + member + brand; returns session cookies.
- Login: correct password → 200 + cookies; wrong → 401; 5 wrong → 423 lock.
- send-otp: rate limited (1/min/identifier); returns success without leaking OTP in prod.
- verify-otp: wrong code 5x → lock; correct → session token issued.
- me: returns official profile or 401.

**Acceptance:**
- Officials can register an org and log in.
- Voters can request + verify OTP and receive a session token.

**Rollback:** disable routes via feature flag; auth lib stays.

---

## Milestone 4 — Election & Portal APIs

**Objectives:** CRUD for elections, positions, candidates, voters; public portal data.

**Files affected:**
- `src/app/api/portal/[subdomain]/route.ts` — public org + elections
- `src/app/api/elections/[id]/route.ts` — election detail (context-scoped)
- `src/app/api/dashboard/elections/route.ts` — list/create
- `src/app/api/dashboard/elections/[id]/route.ts` — get/update
- `src/app/api/dashboard/elections/[id]/positions/route.ts`
- `src/app/api/dashboard/elections/[id]/candidates/route.ts`
- `src/app/api/dashboard/elections/[id]/voters/route.ts` — list + import (CSV)
- `src/app/api/dashboard/elections/[id]/lifecycle/route.ts` — open/pause/close/certify
- `src/app/api/results/[id]/route.ts` — public/live results (visibility-gated)
- `src/app/api/admin/organizations/route.ts` — platform admin org list
- `src/app/api/admin/audit/route.ts` — audit log + chain verify

**Dependencies:** M1, M2, M3.

**Testing:**
- Org admin can create election, add positions + candidates, import voters.
- Cross-tenant: org A admin cannot read org B election (403).
- Public portal returns only `PUBLIC` elections + org branding.
- Results visibility: hidden until close if `hideResultsUntilEnd`; else live.
- Audit chain verifies; tampering a row breaks the chain.

**Acceptance:**
- Full election setup via API works end-to-end.
- A seeded demo election ("Achema SU 2025") is queryable.

**Rollback:** routes are additive; removing them returns 404.

---

## Milestone 5 — Vote Casting API

**Objectives:** Wire the SVE into HTTP: ballot build + cast + receipt verify.

**Files affected:**
- `src/app/api/vote/ballot/route.ts` — POST build ballot (voter session)
- `src/app/api/vote/cast/route.ts` — POST cast vote (SVE)
- `src/app/api/vote/receipt/[code]/route.ts` — GET public receipt verify

**Dependencies:** M2, M3, M4.

**Testing:**
- Build ballot returns signed, shuffled ballot for eligible positions only.
- Cast: happy path returns receipt codes; live count increments.
- Cast: duplicate → 409.
- Receipt verify: valid code → 200 (no candidate info); invalid → 404.

**Acceptance:**
- A voter can complete: eligibility → OTP → ballot → cast → receipt → verify.

**Rollback:** disable cast route; reads still work.

---

## Milestone 6 — Real-time Results Service

**Objectives:** Stand up the socket.io mini-service for live results broadcast.

**Files affected:**
- `mini-services/results-service/index.ts` — Bun + socket.io, port 3030, room-per-election
- `mini-services/results-service/package.json`
- `src/lib/realtime/client.ts` — singleton socket (Strict Mode safe)
- `src/lib/realtime/server.ts` — internal bump endpoint client

**Dependencies:** M5.

**Testing:**
- Service starts on 3030; health check responds.
- Joining `election:<id>` room receives current tally on join.
- `bump(electionId)` triggers broadcast of fresh tally.
- Socket singleton: one connection per tab even under Strict Mode.

**Acceptance:**
- Casting a vote updates the live results board within ~1s without a manual refresh.

**Rollback:** frontend falls back to 5s polling (already implemented as `refetchInterval`).

---

## Milestone 7 — Frontend: Marketing & Auth

**Objectives:** Landing page, login, register — the public face.

**Files affected:**
- `src/app/page.tsx` — landing (Hero, TrustStrip, FeatureBento, HowItWorks, StatCounter, CTA, SiteFooter)
- `src/components/votewise/marketing/*`
- `src/app/(auth)/login/page.tsx` + form component
- `src/app/(auth)/register/page.tsx` + wizard
- `src/components/votewise/marketing/site-nav.tsx`, `site-footer.tsx`

**Dependencies:** M0, M3.

**Testing:**
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- Keyboard-only nav works.
- Register wizard creates org and redirects to dashboard.
- Login authenticates and redirects to dashboard.

**Acceptance:**
- Landing renders with no console errors; footer is sticky to bottom on short pages.
- Auth flows complete via agent-browser.

**Rollback:** revert page files; API unaffected.

---

## Milestone 8 — Frontend: Org Portal & Voting

**Objectives:** The voter-facing experience: portal, candidates, vote, results, verify.

**Files affected:**
- `src/app/o/[subdomain]/layout.tsx`
- `src/app/o/[subdomain]/page.tsx` — lifecycle-aware portal
- `src/app/o/[subdomain]/candidates/page.tsx`
- `src/app/o/[subdomain]/vote/page.tsx` — OTP auth → ballot → review → confirmation
- `src/app/o/[subdomain]/results/page.tsx` — live board (socket + poll fallback)
- `src/app/o/[subdomain]/verify/page.tsx` — receipt lookup
- `src/components/votewise/org/*`, `src/components/votewise/vote/*`

**Dependencies:** M5, M6, M7.

**Testing:**
- Portal shows correct phase (before/during/after) based on election status.
- Voter can authenticate, cast, receive receipt, verify receipt.
- Live results update without refresh during a vote.
- Mobile layout holds; footer sticky.

**Acceptance:**
- End-to-end voter journey verified via agent-browser on a seeded election.

**Rollback:** revert page files.

---

## Milestone 9 — Frontend: Dashboard & Admin

**Objectives:** Election admin workspace + platform admin console.

**Files affected:**
- `src/app/dashboard/layout.tsx` — sidebar shell
- `src/app/dashboard/page.tsx` — overview
- `src/app/dashboard/elections/page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- `src/app/admin/layout.tsx`, `page.tsx`
- `src/components/votewise/dashboard/*`, `src/components/votewise/admin/*`

**Dependencies:** M4, M7.

**Testing:**
- Admin can create election, add positions/candidates, import voters, open, certify.
- Platform admin can list orgs, view health, verify audit chain.

**Acceptance:**
- Full election lifecycle operable from the UI.

**Rollback:** revert page files.

---

## Milestone 10 — Seed Data & Demo

**Objectives:** A deterministic seed so the app is demonstrable out of the box.

**Files affected:**
- `prisma/seed.ts` — creates: 1 platform admin, 2 orgs (Achema State University + CoopLine
  Cooperative), 2 elections (one LIVE, one SCHEDULED), positions, candidates, voters, cast a
  handful of votes so live results are non-empty.

**Dependencies:** M9.

**Testing:** seed is idempotent (`upsert`); running twice yields same state.

**Acceptance:** fresh `db:push && db:seed` produces a fully demoable app.

**Rollback:** `db:push --accept-data-loss` resets.

---

## Milestone 11 — Polish, A11y, Docs, Git

**Objectives:** Final quality pass.

**Files affected:**
- `README.md` — setup, scripts, architecture pointer
- `docs/` — this set of planning docs
- `.env.example`
- a11y sweep across all pages
- lint clean

**Dependencies:** all prior.

**Testing:** agent-browser full pass; axe-core; keyboard-only voting flow.

**Acceptance:**
- Lint passes.
- Agent-browser confirms every core flow.
- README explains how to run + how to push to `votewise-updated`.

**Rollback:** n/a.

---

## Sequencing summary

```
M0 ─┬─> M1 ─┬─> M2 ──> M5 ──> M6 ──┐
    │       ├─> M3 ──> M4 ─────────┼─> M8 ─┐
    │       └───────────────────────┴─> M7 ─┼─> M9 ─> M10 ─> M11
```

M0 (design system) and M1 (schema/lib) are the two roots. Everything else fans out from them.
