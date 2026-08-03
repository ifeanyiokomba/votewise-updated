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
