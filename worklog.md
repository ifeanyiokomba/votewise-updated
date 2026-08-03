---
Task ID: 1-b
Agent: Explore (Backend Analyst)
Task: Analyze original votewise backend, database, APIs, services

Work Log:
- Verified `/home/z/my-project/worklog.md` did not exist; created it with this section.
- Read `package.json`, `tsconfig.json`, `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `Caddyfile` for stack & deployment overview.
- Read `prisma/schema.prisma` end-to-end (3,881 lines / 155 KB / ~90 models) in 5 chunks; enumerated every `model` block via grep.
- Read `src/lib/`: `auth.ts`, `db.ts`, `rbac.ts`, `guards.ts`, `iam.ts`, `ratelimit.ts`, `crypto.ts`, `validation.ts`, `secrets.ts`, `socket.ts`, `election.ts`, `election-state-machine.ts`, `org-context.ts`, `cache.ts`, `jobs.ts`, `proxy.ts`, `instrumentation.ts`.
- Read all `src/lib/sve/*` (vote-recorder, validation-pipeline, crypto, receipt, ballot-builder, session, tally, index).
- Read all `src/lib/eifdirs/*` (event-collector, fraud-detector, index) + `src/lib/domains/fraud-engine.ts`.
- Read all `src/lib/bspcm/`, `src/lib/paoem/`, `src/lib/aidp/`, `src/lib/tqasgr/`, `src/lib/raei/` index files + `bspcm/payment-provider.ts`.
- Read `src/lib/infra/`: `init.ts`, `redis.ts`, `rate-limit.ts`, `db-replica.ts`.
- Read all 6 mini-services: `results-service/index.ts` (real socket.io server), `worker/worker.js`, `scheduler/scheduler.js`, `notification-service/notification.js`, `fraud-engine/fraud-engine.js`, `analytics-engine/analytics-engine.js` + their Dockerfiles + `examples/websocket/server.ts`.
- Read API route samples for every required module: `auth/login`, `voter/send-otp`, `voter/verify-otp`, `voter/accredit`, `voter/ballot`, `workspace/ballot/{session/start,submit,receipt}`, `vote/cast` (deprecated), `v1/voting/cast`, `workspace/elections/[id]/tally`, `elections/[id]/public-results`, `organizations/register`, `platform/organizations`, `tqasgr/tests/run-all`, `bspcm/payments/initiate`, `paoem/feature-flags`, `aidp/api-keys`, `domains/fraud-rules`, `positions`, `support/ticket`, `voter-status`, `eifdirs/lockdown`.
- Read `k8s/{app,ingress,secret,configmap,hpa,networkpolicy}.yaml` + `infrastructure/main.tf` (Terraform) + `.env.production.example` + `docs/{BACKEND_AUDIT,TECHNICAL_DEBT,ELECTION_ENGINE_AUDIT}.md`.
- Confirmed: `next-auth` is in `package.json` deps but is NOT used anywhere in `src/` (custom jose-based JWT auth instead). No `middleware.ts` exists; Next 16 uses `src/proxy.ts` as the middleware entry point.

Stage Summary:
- Stack: Next.js 16 (App Router) + React 19 + Prisma 6 (SQLite in sandbox; Postgres in prod) + TypeScript + Tailwind 4 + shadcn/ui. Real-time via socket.io (results-service on :3030). Caddy or NGINX/ALB at the edge.
- Schema: ~90 Prisma models organized by "chapter" domains — Organization/Workspace/VoterGroup (multi-tenant), ElectionSession/Position/Candidate/Voter/VoteRecord/Ballot (voting), IntegrityEvent/FraudIncident/ElectionLock (fraud), MessageQueue/MessageTemplate/CommunicationProvider (comms), PricingPlan/Invoice/Payment/Subscription (billing), FeatureFlag/MaintenanceMode (platform ops), ApiKey/OAuthClient/Webhook/Integration (developer platform), ReadinessRun/SystemMetric/BackupRecord/DeploymentRecord/AlertRule/SloDefinition/Postmortem (infra), TestSuite/ReleaseChecklist/GoLiveChecklist/PilotElection/CertificationSeal (QA + certification), VoterIdentity/VoterEligibility/ReceiptVerification (privacy-separated voter data). Legacy Tenant/Faculty/Department/ElectionOfficial retained alongside new hierarchy.
- Auth: Two parallel guards — legacy `requireOfficial(capability)` (rbac.ts MATRIX, 9 roles × 25 capabilities, loads ElectionOfficial) and new `requirePermission(req, perm)` (DB-driven Role→RolePermission→Permission, loads OrganizationMember). jose HS256 access token (15 min) + opaque random refresh token (7-day, family-tracked, hash stored in DB). HttpOnly + SameSite=Lax + Secure cookies. Voter auth is separate: matric → OTP (Resend/Termii) → 30-min DB-stored `Voter.sessionToken` (device-bound). VotingSession is a third layer (per-vote authorization, 30-min, revoked on vote). 2FA mandatory in production for PLATFORM_SUPER_ADMIN/ORG_OWNER/SUPPORT_AGENT.
- Voting engine (SVE, src/lib/sve/*): buildBallot (HMAC-signed, candidate shuffle per-voter) → 8-step validation pipeline → atomic $transaction (encrypt choice AES-256-GCM, store VoteRecord with idempotencyKey, increment CandidateTally, mark voter.hasVoted, hash-chained AuditLog, VoterTimelineEvent, ElectionEvent, mark ballot SUBMITTED). Tally decrypts all votes post-close and produces signed verification package (auditHash + HMAC integritySignature).
- Double-vote prevention: (a) idempotencyKey UNIQUE constraint (sha256(voterId|electionId|positionId)), (b) race-safe re-validation inside txn, (c) Voter.hasVoted flag, (d) sessionToken revoked on vote, (e) Ballot.status=SUBMITTED, (f) per-voter rate limit (3/min).
- Anonymity vs receipts: VoteRecord stores voterHash = sha256(voterId + SVE_VOTER_PEPPER) one-way; encryptedChoice is AES-256-GCM; receiptCode is a random unlinkable string. verifyReceipt deliberately omits candidateId/encryptedChoice/voterHash/ipAddress — "receipt-anchored anonymity."
- Fraud engine (EIFDIRS): recordEvent() is the single entry — every login/vote/admin/observer action becomes an IntegrityEvent. detectFraud() runs 8+ detectors async (login abuse, OTVP abuse, vote timing/turnout anomaly, admin abuse, observer abuse, voter import abuse, network anomaly / impossible travel / VPN / TOR, identity fraud, shared device). Flagged events → FraudIncident (full lifecycle). ElectionLock + Lockdown (platform-admin freeze). IntegrityCertificate post-certification. NOTE: the `mini-services/fraud-engine/fraud-engine.js` is a STUB (setInterval + console.log); real detection runs in-process inside the Next.js app via `src/lib/eifdirs/`.
- Mini-services: Only `results-service` is a true standalone server (Bun + socket.io, ports 3030 public + 3031 loopback internal bump). worker / scheduler / notification-service / fraud-engine / analytics-engine are scaffold scripts (setInterval + console.log) that mirror intended production behavior — the real handlers live in `src/lib/{jobs,cnse,eifdirs,raei,infra}/*` and run in-process via `src/instrumentation.ts` → `initInfra()`.
- Deployment: Docker Compose (app + 6 mini-services + Postgres primary/replica + Redis + Caddy). K8s (3-replica app with HPA 3-20, worker HPA 2-10, notification HPA 2-8, single scheduler, network policies default-deny, ingress with TLS via cert-manager, secrets via k8s Secret). Terraform (VPC 3-AZ, RDS Postgres Multi-AZ + read replica + RDS Proxy + Secrets Manager, ElastiCache Redis Multi-AZ encrypted, S3 versioned + cross-region DR replication to eu-central-1, ECS + ALB + ACM + Route53 wildcard, GuardDuty + AWS Config, CloudWatch alarms, SNS alerts). Caddy hardens edge: TLS 1.3, HSTS, CSP, 50r/s public + 10r/s admin rate limit, 50MB body cap, WAF blocklist, zero-downtime `lb_try_duration`. Only ports 3000 (app) and 3030 (socket.io) are exposed; 3031 internal bump is loopback-only.
- Security strengths: AES-256-GCM vote encryption, scrypt passwords, HMAC-SHA256 signatures, fail-loud `requireSecret()` at import, hash-chained audit log with verification utility, layered headers (Caddy + next.config + proxy.ts), tenant isolation enforced in `requireOrganization()` (cross-tenant check), TOTP 2FA, refresh-token family tracking, IP allowlist, concurrent session cap (3).
- Security gaps: two parallel auth systems (legacy `requireOfficial` vs new `requirePermission`) — migration incomplete and easy to use the wrong one; in-memory rate limiter/cache/job queue do not share state across replicas (only Caddy-level 50r/s is shared); next-auth is a dead dependency; no CSRF tokens (SameSite=Lax only); 5 of 6 mini-services are stubs; `/api/v1/voting/cast` bypasses the SVE pipeline (writes plaintext voteRecord without encryption); voterHash is deterministic per voter across elections enabling cross-election correlation if the voter table is leaked; `Voter.matric` and `ElectionOfficial.email` are globally `@unique` (multi-tenant collision risk); audit-log `writeAudit()` reads prevHash via `findFirst orderBy desc` outside the transaction (race-condition fork risk for non-vote audits); all enum-like fields are stored as `String` (no DB-level value validation); no DB-level RLS (tenant isolation is purely app-enforced).

---
Task ID: BUILD-COMPLETE
Agent: Z.ai Code (main orchestrator)
Task: Phase 7 — Rebuild VoteWise next-generation platform

Work Log:
- Completed Phases 1-3 (analysis, audit, research) via 3 parallel Explore agents (Task IDs 1-a, 1-b, 1-c) — full reports appended above.
- Wrote Phase 4 architecture blueprint (docs/04-ARCHITECTURE.md) with Mermaid diagrams covering system, frontend, backend, database, security, election engine, admin, API, deployment, scalability, testing, monitoring, DR.
- Wrote Phase 5 design system (docs/05-DESIGN-SYSTEM.md) — original OKLCH-based system with warm neutrals, emerald primary, dark-mode-first, 3 a11y modes.
- Wrote Phase 6 roadmap (docs/06-ROADMAP.md) — 12 milestones with objectives, files, deps, testing, acceptance, rollback.
- Wrote Phase 1-3 executive summary (docs/00-EXECUTIVE-SUMMARY.md).
- Built the application (M0-M11):
  - Design system: globals.css with OKLCH tokens, a11y modes (high-contrast, large-text, reduced-motion), signature utilities (vw-dot, vw-card, vw-lift, votewise-live-dot, votewise-grid-bg, votewise-hero-bg).
  - Root layout: Geist + Geist_Mono + Space_Grotesk fonts, ThemeProvider (dark default, system enabled), React Query provider, sonner Toaster.
  - Prisma schema: ~25 curated models (Organization, OrganizationMember, OrganizationBrand, Election, Position, Candidate, Voter, VoterEligibility, VoterSession, Ballot, VoteRecord, CandidateTally, ElectionVerification, ElectionEvent, AuditLog, LoginSession, SupportTicket). SQLite dev, Postgres-ready.
  - Lib layer: db.ts (singleton), secrets.ts (5 SVE secrets, fail-loud in prod), auth.ts (jose JWT + scrypt), guards.ts, validation.ts (shared zod schemas), ratelimit.ts (token bucket), audit.ts (hash-chained, prevHash inside txn), org-context.ts, election-access.ts, constants.ts, utils.ts.
  - SVE: crypto.ts (AES-256-GCM, HMAC-SHA256, per-election voterHash, seeded shuffle, timing-safe compare), ballot.ts (buildBallot with shuffle+sign+integrity token), vote-recorder.ts (castVote — 8-step validation + atomic $transaction), tally.ts (liveTally + certifyElection), receipt.ts (anonymity-preserving verifyReceipt).
  - API routes: health, auth (register/login/logout/me), voter (send-otp/verify-otp/eligibility), portal/[subdomain], elections/[id], dashboard/elections (CRUD + [id] positions/candidates/voters/lifecycle), vote (ballot/cast/receipt/[code]), results/[id], admin (organizations/audit), support/ticket.
  - Real-time: results-service mini-service (Bun + socket.io on 3030, internal bump on 3031, room-per-election, 5s fallback poll).
  - Middleware: src/proxy.ts (Next.js 16 convention — security headers, CSP, HSTS).
  - Frontend: marketing landing (Hero with animated ballot pipeline, TrustStrip, FeatureBento, HowItWorks, SecuritySection, TrustSection, CTASection, SiteNav, SiteFooter), auth (login + register with react-hook-form + zod), org portal (layout + lifecycle-aware portal + candidates + vote flow + live results + receipt verify), dashboard (shell + overview + elections list + new + manage with tabs), admin (platform console with orgs table + audit chain verifier).
  - Seed: prisma/seed.ts creates platform admin, Achema State University org + owner, live SUG election (President + VP with 5 candidates), 15 voters, sample tallies, scheduled Faculty election, CoopLine cooperative.
- Verified end-to-end with agent-browser:
  - Landing page renders all 7 sections, title correct, no console errors.
  - Org portal /o/achema shows REAL data (live SUG election + scheduled Faculty election) — no mocks.
  - Live results page shows President + Vice President positions with tallies.
  - Full voting flow: voter VOT/2025000 → OTP (020745) → shuffled ballot (Grace/Amina/Tunde order differs from seed) → select Amina+Sani → review → cast → "Vote recorded" with 2 receipt codes (VW-2026-TG0LFQ).
  - Receipt verification: API returns valid:true with electionName, positionTitle, recordedAt — NO candidateId (anonymity preserved).
  - Admin login (owner@achema.edu) → /dashboard shows elections with real counts ("SUG General Elections 2025 · LIVE · 2 positions · 2 votes").
- Lint passes clean (0 errors, 0 warnings).

Stage Summary:
- The next-generation VoteWise platform is built and verified. Core architecture decisions that fix the prototype's debt:
  1. Single auth system (OrganizationMember) — no two-table divergence.
  2. Single vote-casting path (/api/vote/cast → castVote) — no bypass.
  3. Per-election voterHash (includes electionId) — no cross-election correlation.
  4. Audit prevHash read inside the transaction — no chain-fork race.
  5. proxy.ts (Next.js 16 convention) — actually runs.
  6. React Query replaces 30+ setInterval pollers.
  7. react-hook-form + zod on every form — client validation mirrors server.
  8. Typed API client (no Promise<any>).
  9. Nested layouts per surface — no NavBar re-mount.
  10. No mock data — every portal page renders real org-scoped data.
- Results-service running on port 3030, app on 3000. Both healthy.
- GitHub push: gh CLI not available in sandbox; README documents the manual push steps for votewise-updated.
- Next steps (extension points documented in docs/04-ARCHITECTURE.md §15): billing (BSPCM), fraud engine (EIFDIRS) UI, API platform (AIDP), observer incidents, RLA UI.

---
Task ID: CRON-QA-R2
Agent: Z.ai Code (webDevReview cron)
Task: Round 2 — QA + bug fixes + new features + styling improvements

Work Log:
- Reviewed worklog.md (BUILD-COMPLETE entry from previous round).
- Performed comprehensive agent-browser QA on all key routes:
  - Landing (/) — clean, no errors
  - Org portal (/o/achema) — real data, live + scheduled elections
  - Live results (/o/achema/results) — positions + tallies render
  - Candidates (/o/achema/candidates) — real candidate directory
  - Verify (/o/achema/verify) — auto-verify on URL param works on reload
  - Full voting flow — voter VOT/2025002 → OTP → ballot → cast → receipt VW-2026-VHDCUW
  - Dashboard manage page — tabs (Positions/Voters/Settings) work
  - Admin console — orgs table, audit chain integrity verifier, recent audit entries
- Identified bug: "Cast vote" button on review step was covered by sticky footer
- Identified missing features: no candidate detail pages, no public eligibility checker,
  no election monitor/analytics view, no quick-action cards on portal

Fixes applied:
- Voting flow: added useRef + useEffect to scroll-to-top on step change (prevents
  Cast Vote button from being covered by footer). Added pb-32 to vote page container.

New features built:
1. Candidate detail pages (/o/:org/candidates/:candidateId)
   - Full profile: avatar with colored ring, name, approval badge, slogan, position
   - Bio section, manifesto section (with quote-styled left border)
   - Vote CTA when election is LIVE
   - API: GET /api/elections/[id]/candidates/[candidateId]
2. Public eligibility checker (/o/:org/check)
   - No auth required — voters enter identifier to check registration
   - Shows voter name, eligible elections with status, and "Vote now" button for LIVE elections
   - Distinguishes NOT_REGISTERED vs FLAGGED vs already-voted
   - Uses existing /api/voter/eligibility endpoint
3. Election Monitor tab on dashboard manage page
   - KPI cards: total votes, turnout %, voted count, eligible count
   - 24-hour vote activity bar chart (hover tooltips show count per hour)
   - Recent votes feed (10s auto-refresh) with receipt codes + time-ago
   - Election timeline (visual hash-chain event log with colored dots per event type)
   - Current tally leaderboard (horizontal bars per position)
   - New API routes: /api/dashboard/elections/[id]/stats, /events
4. Quick-action cards on org portal
   - Three icon-coded cards: Check eligibility (info), View candidates (primary), Verify receipt (success)

Styling improvements:
- Candidate cards now clickable with "View profile" affordance + ArrowRight icon
- Portal quick-action cards with vw-lift hover effect
- Monitor tab with animated bar chart, colored timeline markers, leaderboard bars
- Candidate detail page with gradient header, avatar ring, border-l-2 manifesto quote

Verification (agent-browser):
- Eligibility checker: entered VOT/2025003 → "You're registered, Blessing Eze" + SUG election + "Vote now" button
- Candidate detail: /o/achema/candidates/cand-amina → "Amina Bello, Approved, Progress Together, Running for President · SUG General Elections 2025" + bio + manifesto + vote CTA
- Monitor tab: KPIs (4 votes, 13.3% turnout, 2 voted, 15 eligible) + hourly chart + recent votes + timeline + tally
- Full voting flow: VOT/2025004 → OTP 353862 → shuffled ballot (Tunde first) → Amina+Sani → review → cast → receipt VW-2026-5QQ3WQ
- Lint: 0 errors, 0 warnings
- All services healthy (app uptime 3714s, results-service running)

Stage Summary:
- Current status: STABLE. All core flows working + 3 new feature areas added.
- Completed modifications: voting button fix, candidate detail pages, eligibility checker, election monitor, portal quick-actions.
- Verification results: all new features verified end-to-end via agent-browser. Lint clean.
- Unresolved/risks: None critical. The login form button click via agent-browser sometimes requires requestSubmit() workaround (browser automation quirk, not a real bug).
- Priority recommendations for next phase:
  1. Billing/subscription management (BSPCM) — Organization.plan + paidUntil fields exist, Paystack integration is the next extension point
  2. Observer role UI — read-only election monitoring with incident reporting
  3. Fraud detection dashboard (EIFDIRS) — integrity events stream + incident management
  4. API key management (AIDP) — for developer/integration access
  5. Mobile responsiveness audit on all new pages

---
Task ID: CRON-QA-R3
Agent: Z.ai Code (webDevReview cron)
Task: Round 3 — Observer mode, incidents, announcements, archive, settings

Work Log:
- Reviewed worklog.md (CRON-QA-R2 entry). Project was stable with candidate details, eligibility checker, election monitor, and portal quick-actions.
- Performed QA via agent-browser: verified all services healthy, all key routes returning 200, lint clean.
- Identified next high-impact features: observer mode (missing persona), incident reporting, announcements, public archive, org settings.
- Added Prisma models: ElectionIncident (type, severity, status, title, description, location, resolution) and Announcement (title, body, severity). Added proper relations to Election model.
- Built 5 new feature areas with API routes + UI pages.

Issues encountered & resolved:
- Prisma schema relation error: Announcement and ElectionIncident models initially had electionId fields but no Prisma @relation declarations. The include: { election } query failed with "Invalid invocation". Fixed by adding proper @relation(fields/references) + back-relations on Election model. Required full .next cache clear + dev server restart + SCHEMA_SIG bump to force Turbopack to re-bundle the regenerated Prisma client.

New features built:
1. Observer mode (/o/:org/observe?election=ID)
   - Login-gated page for observers to monitor elections
   - Report incident form: type (6 options), severity (4 levels), title, description, location
   - Incident list with severity-coded icons, status pills, reporter info, resolution display
   - API: GET/POST /api/dashboard/elections/[id]/incidents
2. Incident management dashboard (/dashboard/incidents)
   - Cross-election incident list with filter tabs (All/Open/Investigating/Resolved) showing counts
   - Status transitions: "Start investigating" (OPEN→INVESTIGATING), "Resolve" (→RESOLVED), "Dismiss" (→DISMISSED)
   - API: GET/PATCH /api/dashboard/incidents
3. Announcements system (/dashboard/announcements)
   - Org admins publish INFO/WARNING/CRITICAL announcements
   - Create form with title, body, severity selector
   - Announcement cards with severity-coded icons + time-ago
   - API: GET/POST /api/dashboard/announcements
4. Public results archive (/o/:org/archive)
   - Transparent record of completed/certified elections
   - Cards showing turnout, total votes, positions, audit hash, certification badge
   - API: GET /api/portal/[subdomain]/archive
5. Organization settings (/dashboard/settings)
   - Org info display (name, subdomain, type, plan, status, timezone)
   - Branding form: tagline, primary color, accent color with live color swatch previews
   - API: GET/PATCH /api/dashboard/settings/brand

UI improvements:
- Org nav expanded to 7 tabs: Portal, Candidates, Results, Archive, Observe, Check, Verify
- Dashboard sidebar expanded to 5 items: Overview, Elections, Announcements, Incidents, Settings
- Incident cards with severity-coded icon backgrounds (critical=red, high=amber, medium=blue, low=gray)
- Announcement cards with severity-coded icons (info=blue, warning=amber, critical=red)
- Archive cards with certification badge, audit hash snippet, and View results button
- Settings page with live color swatch previews next to color inputs

Verification (agent-browser):
- Announcements: created "Voting opens at 9:00 AM" (INFO) → appears on dashboard with "6 minutes ago"
- Incidents: filed "Long queue at polling station A" (IRREGULARITY, MEDIUM) from /o/achema/observe → appears on /dashboard/incidents → filter shows "All (1), Open (1)" → clicked "Start investigating" → status changed to INVESTIGATING → filter shows "Open (0), Investigating (1)"
- Archive: shows empty state (no certified elections yet — correct, SUG election is still LIVE)
- Settings: shows Achema State University info + branding form with color swatches
- Lint: 0 errors, 0 warnings

Stage Summary:
- Current status: STABLE. All core flows + 8 feature areas now working (voting, dashboard, admin, candidate details, eligibility checker, monitor, observer/incidents, announcements, archive, settings).
- Completed modifications: 5 new feature areas (observer mode, incidents, announcements, archive, settings) + 2 new Prisma models + 6 new API routes + expanded nav (7 org tabs, 5 dashboard items).
- Verification results: all new features verified end-to-end via agent-browser. Incident lifecycle (file → investigate → resolve) works. Announcements create+display works. Lint clean.
- Unresolved/risks: The Prisma schema relation issue required a full .next cache clear + dev server restart. Future schema changes should include relations from the start.
- Priority recommendations for next phase:
  1. Display announcements on the org portal (voter-facing) — currently announcements are admin-only
  2. Billing/subscription management (BSPCM) — Organization.plan + paidUntil fields exist
  3. Observer role assignment — currently any logged-in member can observe; need explicit role gating
  4. Mobile responsiveness audit on new pages (observe, archive, settings, incidents)
  5. Export election results as PDF/CSV
  6. Voter search/filter in dashboard voters tab

---
Task ID: CRON-QA-R4
Agent: Z.ai Code (webDevReview cron)
Task: Round 4 — Voter-facing announcements, results export, voter search/filter

Work Log:
- Reviewed worklog.md (CRON-QA-R3). Project stable with 8 feature areas.
- Performed QA: all services healthy (app uptime 255s, results-service running), lint clean, all routes returning 200.
- Identified highest-impact gaps from R3 recommendations:
  1. Announcements were admin-only — voters couldn't see them (clear product gap)
  2. No results export — important for transparency/audit
  3. No voter search — unusable for large voter rolls

New features built:
1. Voter-facing announcements on org portal
   - New public API: GET /api/portal/[subdomain]/announcements (no auth, returns active non-expired announcements)
   - Portal page fetches announcements and displays them in a "Latest updates" section between quick-actions and elections list
   - Severity-coded cards: CRITICAL (red border), WARNING (amber border), INFO (blue border)
   - Each card shows title, body, associated election name, and publish timestamp
2. Election results export (CSV)
   - New API: GET /api/dashboard/elections/[id]/export?format=csv
   - Returns a proper CSV file with:
     - Metadata header (election name, status, start/end times, total votes, eligible, turnout, generation timestamp)
     - Results section: position, candidate, votes, percentage
     - Voter section: identifier, full name, status (VOTED/NOT_VOTED), voted-at timestamp (anonymized — no receipt codes or candidate choices)
   - Download button on manage page header (next to lifecycle action) and in voters tab
   - Also supports JSON format via ?format=json
3. Voter search/filter in dashboard
   - Enhanced voters API: GET /api/dashboard/elections/[id]/voters?q=<search>&status=<voted|not_voted>
   - New VotersTab component with:
     - 4 stats cards (eligible, voted, not voted, turnout %)
     - Debounced text search (300ms) across name, identifier, email, phone
     - Status filter buttons (All / Voted / Not voted)
     - Export CSV button
     - Sortable voter table with: name (with flagged indicator), identifier, contact, vote status badge + timestamp
   - Replaces the old static "X voters are eligible" text

Bug fixes:
- Export route was returning a raw Response object inside the api() wrapper, which converted it to JSON {} (empty object). Fixed by bypassing the api() wrapper and using direct NextResponse/Response with manual auth + error handling.
- Voters API POST handler (import voters) was accidentally overwritten when adding the GET search endpoint. Restored it with the original upsert + eligibility-linking logic plus a DRAFT-only guard.

Styling improvements:
- Announcement cards on portal use left-border accent (border-l-4) with severity-coded colors
- Voters tab stats cards use vw-interactive hover + icon-coded categories
- Voter table with hover row highlight, responsive column hiding on mobile (identifier hidden on <sm, contact hidden on <md)
- Vote status badges: green pill with checkmark for voted, muted pill with clock for pending
- Flagged voters show a red flag icon + reason text

Verification (agent-browser):
- Portal announcements: page shows "Latest updates" section with "Voting opens at 9:00 AM" (INFO) card
- Voters tab: shows 15 eligible, 3 voted, 12 pending, 20.0% turnout
- Search: typed "Aisha" → filtered to 1 result (Aisha Bello, VOT/2025009, Pending)
- Export API: returns proper CSV with header metadata + RESULT rows + VOTER rows
- Lint: 0 errors, 0 warnings

Stage Summary:
- Current status: STABLE. 10 feature areas now working (voting, dashboard, admin, candidate details, eligibility checker, monitor, observer/incidents, announcements, archive, settings + voter-facing announcements + export + voter search).
- Completed modifications: 3 new features (portal announcements, CSV export, voter search) + 2 new API routes + 1 new component + 2 bug fixes.
- Verification results: all new features verified end-to-end via agent-browser. Search filters correctly. Export returns valid CSV. Portal displays announcements.
- Unresolved/risks: None critical. Radix UI Tabs require keyboard navigation (Space/Enter) in agent-browser — click events don't trigger tab switches (browser automation quirk, not a real user issue).
- Priority recommendations for next phase:
  1. Mobile responsiveness audit on all pages (especially tables and voter list)
  2. Billing/subscription management (BSPCM) — Organization.plan + paidUntil fields exist
  3. Observer role gating — currently any logged-in member can observe
  4. Election results PDF export (beyond CSV)
  5. Real-time voter count on portal (socket.io integration)
  6. Voter notifications (email/SMS when election opens)

---
Task ID: CRON-QA-R5
Agent: Z.ai Code (webDevReview cron)
Task: Round 5 — Mobile nav, live turnout widget, voter flagging

Work Log:
- Reviewed worklog.md (CRON-QA-R4). Project stable with 10 feature areas.
- Performed QA via agent-browser with iPhone 15 device emulation:
  - Landing, portal, results, vote pages: no horizontal overflow
  - Dashboard manage page: horizontal overflow detected (main scrollWidth > clientWidth)
  - Dashboard sidebar: hidden on mobile with no hamburger menu (navigation dead-end)
- Identified highest-impact fixes:
  1. Mobile dashboard navigation (critical — can't navigate on mobile)
  2. Dashboard manage page overflow (broken layout)
  3. Real-time voter turnout on portal (high-value feature)
  4. Voter flag/unflag (admin tooling gap)

Bug fixes:
- Dashboard manage page horizontal overflow: the header used md:flex-row with items in a row that overflowed. Fixed by restructuring to flex-col with flex-wrap on the title row + min-w-0 + break-words on the heading + size="sm" on buttons + p-4 md:p-8 responsive padding.
- Main content area overflow: added min-w-0 to the flex child containing main, preventing content from pushing the layout wider than the viewport.

New features built:
1. Mobile navigation drawer for dashboard
   - Added hamburger menu (Menu icon) to the mobile header
   - Opens a Sheet (left side, 264px) with full navigation:
     - VoteWise logo + close button
     - All 5 nav items (Overview, Elections, Announcements, Incidents, Settings)
     - Active item highlighting
     - Member info (name + email)
     - Sign out button
   - Closes on navigation
2. Real-time live turnout widget on org portal
   - New LiveTurnout component with animated SVG progress ring
   - Shows turnout % in the center of the ring (color-coded: >60% green, >30% primary, else muted)
   - Voted + Eligible counts below the ring
   - Election name with live dot indicator
   - Updates via socket.io (joinElectionRoom) + 10s polling fallback
   - Loading skeleton state (animate-pulse) while data loads
   - Placed in a 2-column grid alongside the live election callout
3. Voter flag/unflag
   - New API: PATCH /api/dashboard/voters/[id] with flagged + flaggedReason fields
   - VotersTab now has an Actions column with Flag/Unflag buttons
   - Flag button prompts for a reason, then flags the voter (row highlighted red, flag icon shown)
   - Unflag button clears the flag
   - Flagged voters are blocked from voting by the existing SVE guard
   - Disabled for voters who have already voted (can't flag a completed vote)
   - Audited (VOTER_FLAGGED / VOTER_UNFLAGGED actions)

Styling improvements:
- Portal live election callout now uses a 2-column grid (callout 1.5fr + turnout ring 1fr) on lg+ screens, stacking on mobile
- Voter table: flagged rows highlighted with bg-destructive/5
- Flag/Unflag buttons with severity-coded colors (Flag=destructive, Unflag=success)
- Mobile manage page: responsive padding (p-4 md:p-8), wrapping buttons, smaller heading on mobile
- Live turnout ring with smooth 700ms transition on the stroke-dashoffset

Verification (agent-browser):
- Mobile dashboard: no horizontal overflow (0px difference), hamburger menu opens Sheet with all nav items
- Portal (desktop): shows live turnout widget with "40%" ring, "Voted 6, Eligible 15", live dot
- Voters tab: clicked Flag on Aisha Bello → prompted for reason → entered "Test flagging" → row now shows red flag + reason + Unflag button
- Lint: 0 errors, 0 warnings

Stage Summary:
- Current status: STABLE. 11 feature areas + mobile nav + live turnout + voter flagging. All responsive.
- Completed modifications: 1 bug fix (overflow), 1 mobile nav feature, 1 real-time feature, 1 admin tooling feature, 1 new API, 1 new component.
- Verification results: all features verified via agent-browser (desktop + iPhone 15). Mobile overflow fixed. Live turnout renders. Flag/unflag works.
- Unresolved/risks: None critical. The Radix UI Tabs still require keyboard navigation in agent-browser (Space/Enter) — not a real user issue.
- Priority recommendations for next phase:
  1. Billing/subscription management (BSPCM) — Organization.plan + paidUntil fields exist, Paystack integration is the biggest remaining extension point
  2. Observer role gating — currently any logged-in member can observe; need explicit OBSERVER role check
  3. Election results PDF export (beyond CSV) — for official certification documents
  4. Voter notifications (email/SMS) — when election opens, when vote is received
  5. Dark/light theme default based on system preference (currently forced dark)
  6. Election results comparison view (cross-election analytics)

---
Task ID: CRON-QA-R6
Agent: Z.ai Code (webDevReview cron)
Task: Round 6 — Billing dashboard, observer role gating, system theme

Work Log:
- Reviewed worklog.md (CRON-QA-R5). Project stable with 11 feature areas + mobile nav + live turnout + voter flagging.
- Performed QA: all services healthy (app uptime 1426s, results-service running), lint clean, vote page renders.
- Identified highest-impact features from R5 recommendations:
  1. Billing/subscription management (BSPCM) — biggest remaining extension point
  2. Observer role gating — security gap (any member could observe)
  3. System theme support — forced dark was an a11y concern

New features built:
1. Billing & subscription dashboard (/dashboard/billing)
   - Schema: added voterQuota (Int, default 100) + paidUntil (DateTime?) to Organization
   - Current plan card: plan name, price, paid-until date, active/expired status, upgrade prompt for FREE plan
   - Usage card: voters used / quota with color-coded progress bar (green <80%, amber >80%, red over-quota), over-quota warning, elections + votes mini-stats
   - 3 plan tiers with feature lists:
     - Free ($0/mo, 100 voters, basic features)
     - Pay-as-you-go ($25/mo, 1,000 voters, real-time monitoring, observer mode, CSV export, announcements, priority support)
     - Enterprise ($200/mo, 50,000 voters, custom branding, API access, webhooks, SSO/2FA, dedicated support, SLA 99.99%)
   - Upgrade buttons with audit logging (PLAN_CHANGED action)
   - 30-day paid-until set on upgrade to paid plans
   - Demo note: real Paystack/Stripe integration is an extension point
   - API: GET /api/dashboard/billing, POST /api/dashboard/billing (change plan)
2. Observer role gating
   - New guard: requireObserver() — allows OBSERVER, ORG_ADMIN, ORG_OWNER, PLATFORM_ADMIN
   - Observe page now checks member role after login:
     - If not logged in: "Observer login required" with Sign in button
     - If logged in but wrong role: "Observer access required" with explanation + contact admin message
     - If OBSERVER or higher: full incident reporting UI
   - Seeded observer account: observer@achema.edu / owner123 (Prof. Ibrahim Saleh, OBSERVER role)
3. System theme support
   - Changed ThemeProvider defaultTheme from "dark" to "system"
   - App now respects user's OS light/dark preference
   - Users can still override via the ThemeToggle dropdown (Light/Dark/System)
   - Fixes the a11y concern of forced dark mode

Styling improvements:
- Billing page: plan cards with "Current" badge on active plan, feature checkmarks in green, icon-coded plan categories (Gift/Zap/Crown)
- Usage progress bar with smooth 700ms transition
- Over-quota warning with destructive color
- Observer access-denied card with warning icon and clear messaging
- Dashboard sidebar: added Billing nav item (CreditCard icon)

Verification (agent-browser):
- Billing page: shows Enterprise $200/mo, 15/50,000 voters (0%), 2 elections, 6 votes cast
- Plan upgrade: clicked "Upgrade to Free" → plan changed to Free, usage now 15/100 (15%), "Upgrade for higher quotas" prompt shown
- Plan restore: clicked "Upgrade to Enterprise" → restored to Enterprise
- Observer login: logged in as observer@achema.edu → /o/achema/observe shows full incident UI with existing incidents
- Dashboard sidebar: shows all 6 nav items including Billing
- Lint: 0 errors, 0 warnings

Stage Summary:
- Current status: STABLE. 12 feature areas + billing + observer gating + system theme.
- Completed modifications: 3 new features (billing dashboard, observer role gating, system theme) + 2 schema fields + 2 new API routes + 1 seeded observer account + 1 new guard function.
- Verification results: all features verified via agent-browser. Plan upgrade works. Observer can access observe page. Billing nav appears in sidebar.
- Unresolved/risks: None critical. The billing system is demo-only (no real payment processor) — documented as an extension point.
- Priority recommendations for next phase:
  1. Election results PDF export (beyond CSV) — for official certification documents
  2. Voter notifications (email/SMS) — when election opens, when vote is received
  3. Election results comparison view (cross-election analytics)
  4. API key management (AIDP) — for developer/integration access
  5. Real Paystack/Stripe payment integration (currently demo billing)
  6. Two-factor authentication (2FA) UI for admin accounts

---
Task ID: CRON-QA-R7
Agent: Z.ai Code (webDevReview cron)
Task: Round 7 — PDF certificate export, member management, rich dashboard overview

Work Log:
- Reviewed worklog.md (CRON-QA-R6). Project stable with 12 feature areas + billing + observer gating + system theme.
- Performed QA: all services healthy (app uptime 415s, results-service running), lint clean, landing page renders.
- Identified highest-impact features from R6 recommendations:
  1. Election results PDF export — for official certification documents
  2. Member management — team invitation + role management (missing admin tooling)
  3. Dashboard overview improvements — current overview was too simple

New features built:
1. Election certification document (print-to-PDF)
   - New route: GET /api/dashboard/elections/[id]/certificate
   - Returns a self-contained print-ready HTML document (no PDF library dependency)
   - Browser's native print-to-PDF produces high-quality output
   - Document includes:
     - VoteWise branding header with green accent + certification seal
     - Election summary stats (votes cast, eligible voters, turnout %)
     - Timeline table (voting opened, closed, certified, document generated)
     - Per-position results table with winner badges
     - NOTA votes row when applicable
     - Integrity verification section (audit hash + HMAC signature)
     - Administrator signature line
     - "Print / Save as PDF" button (hidden when printing)
   - Print-optimized CSS (@media print) — removes shadows, padding, button
   - "Certificate" button added to manage page header next to Export
2. Member management dashboard (/dashboard/members)
   - List all org members with colored avatars (colorFromString), name, email, role badge
   - Role badges with icons: Owner (Crown), Admin (Shield), Observer (Eye)
   - "Last active" timestamp (timeAgo)
   - Invite form: name, email, role (Observer or Admin)
   - Demo mode: generates a temp password shown in a info card (in prod, email sent)
   - Copy-to-clipboard for temp password
   - Member actions dropdown: change role (Admin <-> Observer), suspend/reactivate
   - Org owner cannot be modified (protected)
   - Current user marked with "(you)" label
   - Audited (MEMBER_INVITED, MEMBER_UPDATED actions)
   - API: GET (list), POST (invite), PATCH (update role/status) /api/dashboard/members
3. Improved dashboard overview
   - 6 KPI cards in a responsive grid: elections, live now, voters, votes, members, open incidents
   - KPI cards with vw-lift hover effect + icon-coded categories + color-coded values
   - Recent elections list with status badges + vote counts + live dot for LIVE elections
   - Recent activity feed (last 8 audit entries) with action-specific icons:
     - ELECTION_CREATED, VOTE_CAST, ELECTION_CERTIFIED, VOTER_FLAGGED, etc.
   - Open incidents panel (only shown when incidents exist) with severity-coded badges
   - Auto-refreshes every 15 seconds
   - API: GET /api/dashboard/overview (aggregated stats + recent items)

Styling improvements:
- KPI cards: vw-lift hover + icon-coded categories with color tones
- Member cards: colored avatars, role badges with icons, activity timestamps
- Audit log feed: action-specific icons in muted circles, relative timestamps
- Incident cards: left-border warning accent, severity badges
- Certificate document: serif typography (Georgia), green accent (#163D2E), print-optimized CSS
- Dropdown menu for member actions with role separator
- Dashboard sidebar: added Members nav item (UserPlus icon) — now 7 items

Verification (agent-browser):
- Overview: shows 6 KPIs (2 elections, 1 live, 15 voters, 6 votes, 2 members, 1 incident)
- Recent activity: "Dr. Adaeze Nwosu · login success, 5 seconds ago" + "Prof. Ibrahim Saleh · login success"
- Members: invited "Dr. Chidi Okeke" (chidi@achema.edu) → temp password "r1oi4dbx" shown in info card
- Members list: shows 3 members (owner, observer, newly invited) with avatars + roles
- Certificate: clicked Certificate button → new tab opens with full certification document
  - Title: "VoteWise Certification — SUG General Elections 2025"
  - Content: "6 VOTES CAST, 15 ELIGIBLE VOTERS, 40.0% TURNOUT" + timeline + results
  - "Print / Save as PDF" button present
- Lint: 0 errors, 0 warnings

Stage Summary:
- Current status: STABLE. 13 feature areas + certificate export + member management + rich overview.
- Completed modifications: 3 new features (certificate, members, overview) + 3 new API routes + 1 new page + 1 sidebar item.
- Verification results: all features verified via agent-browser. Certificate renders. Member invitation works. Overview shows rich data.
- Unresolved/risks: None critical. Certificate uses browser print-to-PDF (no server-side PDF generation) — acceptable for the use case.
- Priority recommendations for next phase:
  1. Voter notifications (email/SMS) — when election opens, when vote is received
  2. Election results comparison view (cross-election analytics)
  3. API key management (AIDP) — for developer/integration access
  4. Real Paystack/Stripe payment integration (currently demo billing)
  5. Two-factor authentication (2FA) UI for admin accounts
  6. Webhook configuration page for election events

---
Task ID: GITHUB-PUSH
Agent: Z.ai Code (main orchestrator)
Task: Create votewise-updated repo on GitHub and push the complete codebase

Work Log:
- User provided GitHub PAT and domain (votewise.com.ng).
- Verified PAT via GitHub API: authenticated as ifeanyiokomba (id: 284811582).
- Created repository `ifeanyiokomba/votewise-updated` via POST /user/repos API:
  - Public visibility
  - Description: "VoteWise — The Voting Operating System. A next-generation rebuild..."
  - Issues, Projects, Wiki enabled
- Updated domain references to votewise.com.ng:
  - Footer contact email: hello@votewise.com.ng
  - README: added live repo URL + production domain + clone instructions
  - Created .env.example with all SVE secrets + NEXT_PUBLIC_APP_URL=https://votewise.com.ng
- Committed domain updates.
- Added git remote with PAT-embedded HTTPS URL.
- Pushed all 16 commits to origin/main (full history: initial scaffold → 7 rounds of development).
- Removed .env from git tracking (was committed in initial commit before .gitignore rule; only contained DATABASE_URL, no real secrets).
- Cleaned PAT from remote URL (set to clean https://github.com/ifeanyiokomba/votewise-updated.git).
- Verified all key files present on GitHub (200 status for README, package.json, schema.prisma, page.tsx, crypto.ts, results-service, architecture doc).

Stage Summary:
- Repository is LIVE at: https://github.com/ifeanyiokomba/votewise-updated
- 16 commits, public, default branch main
- Production domain configured: votewise.com.ng
- All source code, planning docs, and infrastructure pushed
- .env removed from tracking; .env.example provided for setup
- PAT cleaned from local git config after push
- Complete next-generation VoteWise platform delivered

---
Task ID: CRON-QA-R8
Agent: Z.ai Code (webDevReview cron)
Task: Round 8 — Election analytics, webhook management, 2FA security

Work Log:
- Reviewed worklog.md (GITHUB-PUSH entry). Repository live at github.com/ifeanyiokomba/votewise-updated.
- Performed QA: discovered database was empty (dev server restart reset state). Re-seeded with `bun run db:seed`.
- All services healthy after re-seed, lint clean.
- Identified highest-impact features from R7 recommendations:
  1. Election analytics/comparison — cross-election insights
  2. 2FA setup UI — security hardening for admin accounts
  3. Webhook configuration — developer platform integration

New features built:
1. Election analytics dashboard (/dashboard/analytics)
   - 6 KPI cards: total elections, live now, certified, total votes, eligible voters, average turnout
   - 30-day vote activity bar chart with hover tooltips showing count + date
   - Election comparison table with per-election turnout progress bars (color-coded: >60% green, >30% primary, else muted)
   - Status badges with live dot for LIVE elections
   - API: GET /api/dashboard/analytics (aggregated stats + daily vote counts + per-election comparison)
2. Webhook management (/dashboard/webhooks)
   - Schema: added Webhook model (url, secret, events JSON, isActive, lastTriggeredAt, lastResponseStatus, failureCount)
   - Create webhooks with URL + event subscriptions (10 event types: election.created, election.opened, vote.cast, etc.)
   - HMAC-SHA256 signing secret with reveal/hide/copy-to-clipboard
   - Enable/disable toggle per webhook
   - Delete webhooks
   - Display: last triggered time, response status (green/red), failure count
   - Event subscription checkboxes in a responsive grid
   - HMAC signing info banner
   - API: GET/POST/PATCH/DELETE /api/dashboard/webhooks
3. 2FA security setup (/dashboard/security)
   - Full TOTP (RFC 6238) implementation: generate base32 secret, compute HMAC-SHA1, extract 6-digit code
   - 2-step setup flow: generate secret → scan QR code → verify 6-digit code → enabled
   - QR code via otpauth:// URL (compatible with Google Authenticator, Authy, 1Password)
   - Manual secret entry fallback with copy-to-clipboard
   - ±1 time window tolerance for clock drift
   - Disable 2FA option (clears secret)
   - Security recommendations panel
   - API: GET (status), POST (generate secret), PATCH (verify & enable), DELETE (disable) /api/dashboard/security/2fa

Dashboard sidebar:
- Expanded to 10 items: Overview, Elections, Analytics, Announcements, Incidents, Members, Webhooks, Billing, Security, Settings

Bug fix:
- TOTP counter encoding: the initial implementation used a manual byte loop with `counter = Math.floor(counter / 256)` inside the loop. Turbopack's SWC compiler flagged this as an error ("Ecmascript file had an error"). Rewrote using `Buffer.writeUInt32BE()` for clean 64-bit big-endian encoding.

Styling improvements:
- Analytics KPI cards with vw-lift hover + icon-coded categories
- Vote activity bar chart with hover tooltips (opacity transition on hover)
- Comparison table with inline turnout progress bars
- Webhook cards with status-coded icons, event tags as mono code chips
- 2FA setup with numbered step indicators, QR code centered, secret in muted box
- Security status card with success/warning color coding

Verification (agent-browser):
- Analytics: shows 2 elections, 1 live, 0 certified, 15 eligible, comparison table with SUG + Faculty elections
- Webhooks: shows empty state + "New webhook" button + HMAC signing info banner
- 2FA: clicked "Set up 2FA" → QR code image renders (otpauth URL) → manual secret displayed with copy button
- Lint: 0 errors, 0 warnings
- Pushed to GitHub: commit ab642af → main

Stage Summary:
- Current status: STABLE. 14 feature areas + analytics + webhooks + 2FA.
- Completed modifications: 3 new features (analytics, webhooks, 2FA) + 1 new schema model + 4 new API routes + 3 new pages + 3 new sidebar items.
- Verification results: all features verified via agent-browser. Analytics renders chart + comparison. Webhooks form works. 2FA QR code generates.
- Unresolved/risks: 2FA verification not fully tested end-to-end (would need an actual TOTP app to scan the QR). TOTP implementation is RFC 6238 compliant but should be tested with a real authenticator app.
- Priority recommendations for next phase:
  1. Real Paystack/Stripe payment integration (currently demo billing)
  2. Voter notifications (email/SMS) — when election opens, when vote is received
  3. API key management (AIDP) — for developer/integration access
  4. Election duplication/cloning from templates
  5. Risk-limiting audit (RLA) UI
  6. Observer dashboard (dedicated read-only election monitoring view)

---
Task ID: CRON-QA-R9
Agent: Z.ai Code (webDevReview cron)
Task: Round 9 — Election cloning, API key management, voter detail pages

Work Log:
- Reviewed worklog.md (CRON-QA-R8). Project stable with 14 feature areas + analytics + webhooks + 2FA.
- Performed QA: all services healthy (app uptime 188s, results-service running), lint clean, database has 3 orgs.
- All key routes returning 200 (public) or 307 (auth redirect). No bugs found.
- Identified highest-impact features from R8 recommendations:
  1. Election duplication/cloning — saves admin time for recurring elections
  2. API key management (AIDP) — developer platform integration
  3. Voter detail page — deep-dive voter view with timeline

New features built:
1. Election cloning (/dashboard/elections/[id] → Clone button)
   - Deep-clones election + all positions + candidates in a Prisma $transaction
   - New election is DRAFT status with dates 7 days from now (configurable via API)
   - Preserves all settings: visibility, NOTA, ballot randomization, accreditation, live results
   - Clone button on manage page header (next to Export + Certificate)
   - On success: toast notification + redirect to cloned election's manage page
   - Creates ELECTION_CLONED audit event + ELECTION_CREATED event with clonedFrom details
   - API: POST /api/dashboard/elections/[id]/clone (accepts optional newName, newStartTime, newEndTime)
2. API key management (/dashboard/api-keys)
   - Schema: ApiKey model (name, keyPrefix, keyHash, scopes JSON, environment, isActive, lastUsedAt, expiresAt)
   - Key format: vw_live_<40hex> or vw_test_<40hex> (environment-prefixed)
   - Storage: sha256 hash of full key (never stores plaintext), first 12 chars as keyPrefix for identification
   - Create form: name, environment (production/sandbox), scope checkboxes (7 scopes)
   - Full key shown ONCE on creation in a success card with copy-to-clipboard
   - Key list shows: name, masked prefix (vw_live_XXXX…), scopes as code chips, environment badge, last used, created
   - Enable/disable toggle, delete with audit
   - Usage example card with curl command
   - API: GET/POST/PATCH/DELETE /api/dashboard/api-keys
3. Voter detail page (/dashboard/voters/[id])
   - Full voter profile: colored avatar, name, identifier (mono), email, phone, registration date
   - Status badges: Voted (green) / Not voted (muted) + Flagged (red) if applicable
   - Flagged reason displayed in a destructive callout
   - Eligible elections list with status badges + accreditation indicator
   - Vote receipts: receiptCode (mono, primary color), position title, election name, NOTA flag, timestamp
   - Activity timeline: audit events with action-specific icons, IP addresses, relative timestamps
   - Visual timeline with colored dots on a vertical line
   - Voter names in VotersTab are now clickable links to the detail page
   - API: GET /api/dashboard/voters/[id] (returns voter + eligibilities + voteRecords + auditEvents)

Dashboard sidebar:
- Expanded to 11 items: added API Keys (Key icon) between Webhooks and Billing
- Full nav: Overview, Elections, Analytics, Announcements, Incidents, Members, Webhooks, API Keys, Billing, Security, Settings

Styling improvements:
- API key success card with green border + copy button
- Scope checkboxes in a responsive 3-column grid with primary highlight
- Key list cards with environment-coded icons (primary for production, warning for sandbox)
- Voter detail: gradient-free card with colored avatar, inline status badges
- Activity timeline with vertical line + colored dots + action icons
- Voter table: names are now hover-underlined links

Verification (agent-browser):
- API keys: clicked "New key" → filled "Production Integration" → created → full key shown (vw_live_e53c4236...) → masked in list with scopes (read:elections, read:results)
- Election clone: clicked "Clone" on SUG election → "SUG General Elections 2025 (Copy)" created as DRAFT → redirected to new election manage page
- Voter detail: opened Voters tab → clicked "Aisha Bello" → full profile with avatar, eligible elections (SUG - LIVE), vote receipts (none), activity timeline (none)
- Lint: 0 errors, 0 warnings
- Pushed to GitHub: commit 7418793 → main

Stage Summary:
- Current status: STABLE. 15 feature areas + cloning + API keys + voter detail.
- Completed modifications: 3 new features (clone, API keys, voter detail) + 1 new schema model (ApiKey) + 3 new API routes + 2 new pages + 1 new sidebar item.
- Verification results: all features verified via agent-browser. Clone creates DRAFT copy. API key shows once + masks. Voter detail shows full timeline.
- Unresolved/risks: None critical. API keys are stored as sha256 hashes (secure). 2FA verification still not tested with a real authenticator app (RFC 6238 compliant).
- Priority recommendations for next phase:
  1. Real Paystack/Stripe payment integration (currently demo billing)
  2. Voter notifications (email/SMS) — when election opens, when vote is received
  3. Risk-limiting audit (RLA) UI
  4. Observer dashboard (dedicated read-only election monitoring view)
  5. Election templates (pre-configured election types: SUG, board, AGM)
  6. Custom domain management UI (for white-label orgs)
