# VoteWise — Production Readiness Deployment Guide

> Complete implementation of the 10-phase deployment strategy.
> Follow each phase in order. Do not skip.

---

## Phase 1 — Freeze the Codebase

### Branch strategy
```
main          ← production-ready code only
staging       ← pre-production testing
release/v1    ← frozen release branch (bug fixes only)
```

### Cleanup completed
- ✅ Removed dead code: `spiral-background.tsx`, `candidate-orbs.tsx`
- ✅ Removed junk directories: `download/`, `tool-results/`
- ✅ Removed 8 unused packages: `next-auth`, `next-intl`, `@dnd-kit/*`, `@mdxeditor/editor`, `react-markdown`, `react-syntax-highlighter`
- ✅ No experimental pages remain

### Three environments
```
Development   → localhost:3000 (SQLite, in-memory)
Staging       → staging.votewise.com.ng (PostgreSQL, Redis)
Production    → votewise.com.ng (PostgreSQL Multi-AZ, Redis)
```

**Never deploy directly from development to production.**

---

## Phase 2 — Infrastructure

### DNS Configuration

Configure these DNS records at your domain registrar (using Cloudflare):

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | Server IP | Proxied |
| A | `www` | Server IP | Proxied |
| A | `admin` | Server IP | Proxied |
| A | `api` | Server IP | Proxied |
| A | `ws` | Server IP | Proxied |
| A | `status` | Server IP | Proxied |
| A | `docs` | Server IP | Proxied |
| A | `staging` | Staging IP | Proxied |
| A | `*` | Server IP | Proxied |

The wildcard `*` is essential for organization subdomains (e.g., `achema.votewise.com.ng`).

### Cloudflare Settings
- SSL: Full (strict)
- WAF: Enabled
- DDoS protection: Enabled
- Rate limiting: 100 req/10s per IP
- DNS proxy: Enabled for all records
- Automatic HTTPS: Enabled
- Min TLS: 1.2

### VPS Specification (minimum)
- 8 vCPUs
- 16-32 GB RAM
- 300-500 GB NVMe SSD
- Ubuntu 24.04 LTS

---

## Phase 3 — Containerize

### Files created
- `Dockerfile` — multi-stage build (deps → builder → production)
- `docker-compose.prod.yml` — full stack: app, results-service, PostgreSQL, Redis, Caddy
- `Caddyfile.prod` — production reverse proxy with TLS, security headers, rate limiting, WAF

### Services in docker-compose.prod.yml
| Service | Port | Purpose |
|---|---|---|
| app | 3000 | Next.js application |
| results-service | 3030 | Socket.io real-time results |
| db | 5432 | PostgreSQL 16 |
| redis | 6379 | Redis 7 (cache + rate limiting) |
| caddy | 80, 443 | Reverse proxy + TLS + WAF |

### Deploy command
```bash
# Copy .env.production.example to .env.production and fill in all values
cp .env.production.example .env.production
nano .env.production  # fill in ALL secrets

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Run database migration
docker compose -f docker-compose.prod.yml exec app npx prisma db push --accept-data-loss

# Check health
curl http://localhost:3000/api/health
```

---

## Phase 4 — Database

### PostgreSQL Setup

The `docker-compose.prod.yml` includes PostgreSQL 16-alpine.

### Three separate databases
```bash
# Development (local SQLite)
DATABASE_URL="file:./db/custom.db"

# Staging
DATABASE_URL="postgresql://votewise:PASSWORD@staging-db:5432/votewise_staging"

# Production
DATABASE_URL="postgresql://votewise:PASSWORD@db:5432/votewise"
```

**Never share production with staging.**

### Backup Strategy

Create `scripts/backup.sh`:
```bash
#!/bin/bash
# VoteWise database backup script
# Run via cron: 0 * * * * /opt/votewise/scripts/backup.sh

BACKUP_DIR="/opt/votewise/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="votewise-db"

mkdir -p "$BACKUP_DIR"

# Create backup
docker exec $DB_CONTAINER pg_dump -U votewise votewise | gzip > "$BACKUP_DIR/votewise_$TIMESTAMP.sql.gz"

# Retention policy
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +1 -delete   # Keep hourly for 24h
find "$BACKUP_DIR" -name "votewise_*_00.sql.gz" -mtime +7 -delete  # Keep daily for 7 days
find "$BACKUP_DIR" -name "votewise_*_00_*.sql.gz" -mtime +30 -delete  # Keep monthly for 30 days

echo "Backup completed: votewise_$TIMESTAMP.sql.gz"
```

Cron schedule:
```bash
# Hourly incremental
0 * * * * /opt/votewise/scripts/backup.sh

# Daily full (at 2 AM)
0 2 * * * /opt/votewise/scripts/backup.sh

# Weekly snapshot (Sunday at 3 AM)
0 3 * * 0 /opt/votewise/scripts/backup.sh
```

### Test restores
```bash
# Restore from backup
gunzip < /opt/votewise/backups/votewise_20260101_020000.sql.gz | \
  docker exec -i votewise-db psql -U votewise votewise
```

---

## Phase 5 — Object Storage

Use Cloudflare R2 (S3-compatible, zero egress fees) or AWS S3 for:
- Organization logos
- Candidate photos
- Campaign videos
- Documents
- Generated reports

### Configuration
Set in `.env.production`:
```bash
S3_BUCKET="votewise-production"
S3_REGION="auto"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
```

The storage interface is ready in `src/lib/` — swap the local file storage for S3 uploads.

---

## Phase 6 — Secrets

### Required secrets (ALL must be set)

| Secret | Purpose | Generate |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | From POSTGRES_PASSWORD |
| `POSTGRES_PASSWORD` | DB password | `openssl rand -base64 32` |
| `VOTE_ENC_KEY` | AES-256 vote encryption | `openssl rand -hex 32` |
| `VOTER_HASH_PEPPER` | Voter identity hashing | `openssl rand -hex 32` |
| `HMAC_SECRET` | HMAC signatures | `openssl rand -hex 32` |
| `SVE_BALLOT_PEPPER` | Ballot anonymization | `openssl rand -hex 32` |
| `SVE_VOTER_PEPPER` | Voter record anonymization | `openssl rand -hex 32` |
| `JWT_ACCESS_SECRET` | JWT signing | `openssl rand -hex 32` |
| `RESEND_API_KEY` | Email delivery | From Resend dashboard |
| `TERMII_API_KEY` | SMS/WhatsApp | From Termii dashboard |
| `PAYSTACK_SECRET_KEY` | Payment processing | From Paystack dashboard |
| `S3_ACCESS_KEY` | Object storage | From R2/S3 dashboard |
| `S3_SECRET_KEY` | Object storage | From R2/S3 dashboard |
| `SENTRY_DSN` | Error monitoring | From Sentry dashboard |

### Rules
- **Never commit `.env.production` to git** (it's in `.gitignore`)
- Store secrets in GitHub Actions secrets for CI/CD
- Use Docker secrets or a secrets manager for production
- Rotate keys annually

---

## Phase 7 — Build Pipeline

### GitHub Actions CI/CD

File: `.github/workflows/ci-cd.yml`

**Pipeline flow:**
```
Git Push (main/staging)
    ↓
Quality (ESLint + TypeScript check)
    ↓
Build (Docker image → GHCR)
    ↓
Security (Trivy scan + secret detection)
    ↓
Deploy Staging (SSH + docker compose up)
    ↓
Smoke Tests (health check × 12 retries)
    ↓
Manual Approval (GitHub environment)
    ↓
Deploy Production (SSH + docker compose up)
    ↓
Health Check (12 retries)
    ↓
Auto-rollback on failure
```

### Required GitHub Secrets
| Secret | Purpose |
|---|---|
| `STAGING_HOST` | Staging server IP |
| `STAGING_USER` | SSH username |
| `STAGING_SSH_KEY` | SSH private key |
| `PRODUCTION_HOST` | Production server IP |
| `PRODUCTION_USER` | SSH username |
| `PRODUCTION_SSH_KEY` | SSH private key |

### Required GitHub Environments
1. `staging` — auto-deploy on push to `staging` or `main`
2. `production` — requires manual approval before deploy

---

## Phase 8 — Internal Staging

### Deploy to staging
```bash
# On staging server:
cd /opt/votewise
git clone https://github.com/ifeanyiokomba/votewise-updated.git .
cp .env.production.example .env.production
# Edit .env.production with staging values
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma db push --accept-data-loss
```

### Smoke test checklist
- [ ] Registration — create a new organization
- [ ] Login — sign in as org owner
- [ ] Organization creation — verify subdomain resolves
- [ ] Election creation — create from template + manually
- [ ] Candidate management — add, edit, approve candidates
- [ ] Voter import — CSV upload + template download
- [ ] OTP delivery — verify email/SMS delivery
- [ ] Voting flow — full OTP → ballot → cast → receipt
- [ ] Results — live results update via WebSocket
- [ ] Receipt verification — verify a receipt code
- [ ] Analytics — view cross-election comparison
- [ ] Audit log — verify chain integrity
- [ ] Public audit page — verify without login
- [ ] Observer mode — file an incident
- [ ] Billing — upgrade plan
- [ ] API keys — create + use
- [ ] Webhooks — configure + test
- [ ] 2FA — setup TOTP
- [ ] Export — CSV download
- [ ] Certificate — generate PDF

Fix all issues before moving to pilots.

---

## Phase 9 — Pilot Organizations

**Do not launch publicly yet.**

Select 2-5 trusted organizations:
1. A university department
2. A student association
3. An NGO
4. A small company
5. A cooperative

### Pilot checklist per organization
- [ ] Organization profile complete
- [ ] Logo uploaded
- [ ] Branding applied (colors, tagline)
- [ ] Subdomain active and SSL valid
- [ ] Candidates approved with photos
- [ ] Voters imported (CSV)
- [ ] OTP provider healthy (email/SMS test sent)
- [ ] Observers assigned
- [ ] Fraud engine enabled
- [ ] Monitoring active
- [ ] Backups confirmed
- [ ] Pre-election readiness check passed

### During pilot
- Monitor `/api/health` continuously
- Watch audit log for anomalies
- Collect voter feedback
- Document any issues

---

## Phase 10 — Production Launch

Once all pilots are successful:

1. Deploy `votewise.com.ng`:
   ```bash
   cd /opt/votewise
   git pull origin main
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml exec app npx prisma db push --accept-data-loss
   ```

2. Verify health: `curl https://votewise.com.ng/api/health`

3. Enable organization registrations (public onboarding)

4. Activate payment processing (Paystack)

5. Monitor continuously:
   - CPU, Memory, Disk usage
   - Database connections + replication lag
   - Redis memory + hit rate
   - API latency (p50, p95, p99)
   - Failed requests
   - Email/SMS delivery rates
   - OTP success rate
   - Active voting sessions
   - WebSocket connections

---

## Operational Checklist (Before Every Go-Live)

- [ ] Organization profile complete
- [ ] Logo uploaded
- [ ] Branding applied
- [ ] Subdomain active
- [ ] SSL valid
- [ ] Candidates approved
- [ ] Voters imported
- [ ] OTVP configured
- [ ] Email provider healthy
- [ ] SMS provider healthy
- [ ] WhatsApp provider healthy
- [ ] Observers assigned
- [ ] Fraud engine enabled
- [ ] Monitoring active
- [ ] Backups confirmed

---

## Monitoring

### Metrics to track
| Metric | Tool | Alert threshold |
|---|---|---|
| CPU usage | Docker stats / CloudWatch | > 80% for 5 min |
| Memory usage | Docker stats / CloudWatch | > 85% for 5 min |
| Disk usage | df -h | > 80% |
| DB connections | pg_stat_activity | > 80% of pool |
| DB replication lag | pg_stat_replication | > 30s |
| Redis memory | redis-cli INFO | > 80% of max |
| API latency p95 | Application logs | > 500ms |
| Failed requests | Application logs | > 1% error rate |
| Email delivery | Resend dashboard | < 95% delivery |
| SMS delivery | Termii dashboard | < 95% delivery |
| OTP success rate | Application metrics | < 90% |
| Active voting sessions | Application metrics | Monitor peak |
| WebSocket connections | Results-service | Monitor peak |

### Alerting
Configure alerts via:
- Sentry (application errors)
- CloudWatch alarms (infrastructure)
- Slack webhook (operational alerts)
- Email (critical alerts)

---

## When to Deploy

1. ✅ Complete the enterprise refactor (done — audit passed)
2. ⬜ Deploy to staging
3. ⬜ Run at least one complete end-to-end mock election
4. ⬜ Run a pilot with a real organization
5. ⬜ Fix issues found during the pilot
6. ⬜ Deploy to production with confidence

**Do not deploy today. Do not wait until every feature is built.**
**Follow the phases above in order.**
