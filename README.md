# VoteWise — The Voting Operating System

> A next-generation rebuild of the VoteWise election platform. Verifiable, tamper-evident
> elections for any organization — universities, companies, cooperatives, faith bodies, NGOs.

This repository is a clean-room rebuild based on a forensic analysis of the original
[`ifeanyiokomba/votewise`](https://github.com/ifeanyiokomba/votewise) prototype. It carries
forward the prototype's best ideas (receipt-anchored anonymity, atomic vote recording,
hash-chained audit log) and rebuilds the rest with a stronger architectural foundation.

## What's inside

- **Planning docs** (`/docs`) — Phases 1–6: analysis, audit, research, architecture
  blueprint, design system, and implementation roadmap.
- **Application** (`/src`) — Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui.
- **Secure Voting Engine** (`/src/lib/sve`) — AES-256-GCM encryption, HMAC signatures,
  atomic vote recording with 8-step validation, receipt-anchored anonymity.
- **Real-time service** (`/mini-services/results-service`) — Bun + socket.io, live tally
  broadcast via WebSocket.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM (SQLite dev / PostgreSQL prod) |
| Auth | jose JWT + scrypt + HttpOnly cookies |
| Real-time | socket.io |
| State | TanStack Query + Zustand |
| Forms | react-hook-form + zod |

## Quick start

```bash
# install dependencies
bun install

# push the database schema + seed demo data
bun run db:push
bun run db:seed

# start the app (port 3000)
bun run dev

# in a separate terminal, start the real-time results service (port 3030)
bun run results
```

## Demo credentials

After seeding:

| Role | Email | Password |
|---|---|---|
| Platform admin | `admin@votewise.app` | `platform123` |
| Org owner | `owner@achema.edu` | `owner123` |
| Voter | identifier `VOT/2025000` … `VOT/2025014` | OTP shown in dev console |

A live demo election (`election-sug-2025`) is pre-seeded with positions, candidates, voters,
and sample tallies.

## Key routes

| Route | Purpose |
|---|---|
| `/` | Marketing landing |
| `/login` `/register` | Organization auth |
| `/o/:subdomain` | Public org portal (lifecycle-aware) |
| `/o/:subdomain/candidates` | Candidate directory |
| `/o/:subdomain/vote` | Voter journey: OTP → ballot → receipt |
| `/o/:subdomain/results` | Live results (WebSocket + poll fallback) |
| `/o/:subdomain/verify` | Receipt verification (anonymity-preserving) |
| `/dashboard` | Election admin workspace |
| `/dashboard/elections/new` | Create election |
| `/dashboard/elections/[id]` | Manage (positions, candidates, voters, lifecycle) |
| `/admin` | Platform operator console |

## Architecture decisions

See [`docs/04-ARCHITECTURE.md`](docs/04-ARCHITECTURE.md) for the full blueprint with Mermaid
diagrams. Highlights:

- **One engine, one path** — a single SVE handles all vote casting (the prototype had three
  parallel paths, including an insecure bypass).
- **Per-election anonymity** — `voterHash = sha256(voterId + electionId + pepper)` prevents
  cross-election correlation (the prototype's hash was deterministic per voter).
- **Audit inside the transaction** — `prevHash` is read inside the same Prisma `$transaction`
  as the mutation, preventing the chain-fork race the prototype suffered.
- **Types are the contract** — Zod schemas in `src/lib/validation.ts` are shared between
  client and server; no `any` crosses a network boundary.
- **No mock data** — every org-portal page renders real, org-scoped data (8 of 11 were mock
  in the prototype).

## Pushing to your own `votewise-updated` repository

This repository is live at **https://github.com/ifeanyiokomba/votewise-updated**.

Production domain: **votewise.com.ng** (with org subdomains like `achema.votewise.com.ng`).

To clone and run locally:

```bash
git clone https://github.com/ifeanyiokomba/votewise-updated.git
cd votewise-updated
bun install
bun run db:push
bun run db:seed
bun run dev          # app on :3000
bun run results      # results-service on :3030 (separate terminal)
```

## License

© 2026 Okomba Analytics. All rights reserved.
