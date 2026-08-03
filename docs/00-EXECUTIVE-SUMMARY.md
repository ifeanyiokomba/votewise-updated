# VoteWise — Executive Summary (Phases 1–3)

> Synthesis of the forensic analysis of the original `ifeanyiokomba/votewise` prototype.
> Full agent findings are appended to `/home/z/my-project/worklog.md` under Task IDs 1-a, 1-b, 1-c.

---

## Phase 1 — Repository Analysis (what the prototype is)

The original VoteWise is an ambitious multi-tenant election SaaS built on the same Next.js 16 +
Prisma + shadcn/ui + socket.io stack. It carries **157 Prisma models** and **250+ API routes**
organised into 18 "chapter" modules (SVE voting engine, EIFDIRS fraud, CNSE comms, BSPCM billing,
PAOEM platform ops, AIDP dev platform, PIHD infra, TQASGR testing, etc.).

**Product:** any organization (university/company/church/NGO/cooperative) can run secure,
real-time elections with OTP-authenticated voters, encrypted ballots, hash-chained audit logs,
observer monitoring, and public receipt verification.

**Architecture strengths worth preserving:**
- Receipt-anchored anonymity (vote encrypted with AES-256-GCM; receipt proves participation
  without revealing choice).
- Atomic vote recording inside a Prisma `$transaction` with an 8-step pre-validation pipeline.
- Hash-chained `AuditLog` with a genesis anchor.
- Layered security headers (Caddy + next.config + middleware).
- Multi-tenant resolution (custom domain → subdomain → header).
- A genuinely premium design system (OKLCH palette, Geist + Space Grotesk, restrained accents).

---

## Phase 2 — Forensic Audit (what's wrong)

### Critical bugs
1. **8 of 11 org-portal pages render hardcoded mock data** (committee, observers, archive,
   calendar, timetable, results, candidates, candidate detail) — despite docs claiming
   "Implemented".
2. **Cross-tenant authorization bypass** in `org-context.ts`: legacy officials with a `tenantId`
   are allowed into any org ("if the org exists, allow").
3. **Portal stats leak**: `/api/portal/[subdomain]` counts votes globally (missing
   `organizationId` filter) — every org shows the global vote count.
4. **Hardcoded demo credentials** (`admin@votewise.com.ng / admin123`) shipped in 5 client
   components — visible in the JS bundle.
5. **`/api/v1/voting/cast` bypasses the SVE** — writes plaintext votes, stub receipts, no audit.
   A parallel, insecure vote path.
6. **`voterHash` is deterministic per voter across elections** (`sha256(voterId + pepper)`) —
   enables cross-election voter correlation if the voter table leaks.
7. **Audit log race condition**: `writeAudit()` reads `prevHash` outside the transaction
   (except in SVE) — concurrent writes can fork the chain.
8. **`proxy.ts` instead of `middleware.ts`** — non-standard; Next.js may not run it at all.

### Architectural debt
- **Two parallel auth systems** (legacy `requireOfficial` + new `requirePermission`), two user
  tables (`ElectionOfficial` + `OrganizationMember`) — status can diverge.
- **Three vote-casting paths** — deprecated, bypass, and real.
- **5 of 6 mini-services are stubs** — production deployment describes 6 services but only
  `results-service` does real work standalone.
- **Installed-but-unused dependencies:** `next-auth`, `react-query`, `react-hook-form`,
  `@dnd-kit`, `@mdxeditor`, `next-intl` — ~280KB+ of dead `node_modules`.
- **30+ `setInterval` pollers** instead of React Query.
- **`api.ts` fully untyped** (`Promise<any>` everywhere); `1177` `any` occurrences.
- **4 god-components** (5,969 / 3,042 / 2,415 / 2,081 lines).
- **React Strict Mode disabled** to mask a double-socket bug.
- **`typescript.ignoreBuildErrors = true`** in next.config.
- **No real tests** — TQASGR defines 27 suites but the runner simulates execution; CI falls back
  to `--passWithNoTests`.
- **CI/CD deploy steps are `echo` placeholders** — kubectl, blue-green, rollback all commented out.
- **SQLite in sandbox, Postgres in docs** — Redis not actually wired; S3 SDK stubbed.
- **Forced dark mode** (`enableSystem={false}`) — a11y concern.

### Documentation vs reality gap
The docs self-assess 8.5–9.0/10 across five audits, but every doc carries the disclaimer
"self-assessed claims, not independently verified." The worklog itself acknowledges the
SQLite/Redis/S3 production swaps are theoretical, tests are simulated, and CI deploys are echoes.

---

## Phase 3 — Research (what informed the rebuild)

### Enterprise election systems
- **End-to-end verifiability (E2E-V)** is the academic gold standard (Helios, Belenios,
  ElectionGuard) — homomorphic encryption, mixing, ZK proofs. VoteWise's receipt-anchored
  anonymity is a pragmatic middle ground: simpler to implement and audit, sufficient for the
  org-level market, with a documented upgrade path to E2E-V.
- **Risk-limiting audits (RLA)** are the post-election integrity check used in US state
  elections — statistical sampling rather than full recounts. The prototype's `rla.ts` is a
  good skeleton.
- **NIST 1500-10** (Election Results Reporting) and **VVSG 2.0** principles inform the data
  model and audit-log design.

### Modern SaaS architecture
- **One engine, one path** — eliminate parallel implementations of the same critical operation.
- **Types as the contract** — Zod schemas shared across client/server eliminate the `any` class.
- **Nested layouts** per surface prevent NavBar re-mount storms.
- **Real-time only where it earns its place** — socket.io for live results; React Query
  `refetchInterval` for everything else.

### Termii design research (extracted principles, not assets)
The original team's research into termii.com yielded 15 actionable principles that this rebuild
adopts:
1. Restraint is the brand (no gradients/shadows on flat cards).
2. Warm neutrals, not pure white/black.
3. Forest-green primary (not blue/purple) — reads as trust + Africa.
4. Geist + weight 500 for headings (not 700).
5. The "brand period" — single accent-colored `.` at end of headlines.
6. Typography-as-separator (whitespace, not borders, for premium sections).
7. Product visualization > screenshots (animated status mockup).
8. Data as design (big numbers at weight 400).
9. Long-form scroll narrative.
10. Dark mode first.
11. Fixed translucent nav with hairline border.
12. No popups/newsletter spam.
13. Compliance proof as real badges, not claims.
14. Customer stories are outcomes, not testimonials.
15. Asymmetric grids (40/60 hero).

### Accessibility
- WCAG 2.1 AA contrast in both themes (verified via OKLCH perceptual lightness).
- Three user-toggleable modes: high-contrast, large-text, reduced-motion.
- `prefers-reduced-motion` globally respected.
- Keyboard-only voting flow must work end-to-end.
- Focus rings: 2px, visible, offset.

### Performance
- Initial page load < 2s (Lighthouse Performance ≥ 90).
- Vote-cast p95 < 500ms (atomic tally increment; O(1) per vote).
- Live results fan-out via dedicated socket.io service (not per-client polling).
- Font `display: swap`; no layout shift on theme toggle.

---

## What the rebuild carries forward vs rebuilds fresh

| Carry forward (good ideas, re-implemented cleanly) | Rebuild fresh (fix the debt) |
|---|---|
| Receipt-anchored anonymity model | Single auth system (one user table) |
| Atomic vote recording + 8-step validation | Single vote-casting path |
| Hash-chained audit log | `voterHash` includes `electionId` |
| OKLCH design tokens | Audit `prevHash` inside the transaction |
| Multi-tenant resolution chain | `middleware.ts` (not `proxy.ts`) |
| Socket.io results service | React Query (replace 30 pollers) |
| Premium restraint design language | react-hook-form + zod on every form |
| Lifecycle-aware org portal | Typed API client (no `any`) |
| Real candidate/portal data (no mocks) | Components < 500 lines |
| Strict Mode re-enabled | A11y modes + system theme respected |

The rebuild is **not** a 1:1 feature clone of 157 models. It is the load-bearing core
(orgs, elections, voters, SVE, audit, real-time results, admin) built at production quality,
with the remaining modules (billing, fraud UI, dev platform, observer incidents) documented as
extension points that plug into clean seams.
