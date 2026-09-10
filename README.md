# Hayatna Instant Win Campaign

A production-grade QR campaign platform for Hayatna (UAE): customers buy a Hayatna product from
any UAE supermarket, scan a QR code, upload their receipt, get instant AI/OCR-verified eligibility,
and spin a backend-authoritative prize wheel — no retailer integration required.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Prisma (Azure SQL)
· Azure AI Document Intelligence · Azure Blob Storage**.

## Table of Contents

1. [Architecture](#architecture)
2. [Local Setup](#local-setup)
3. [Environment Variables](#environment-variables)
4. [Mock Cloud Mode vs. Real Azure](#mock-cloud-mode-vs-real-azure)
5. [Database](#database)
6. [Running Tests](#running-tests)
7. [Project Structure](#project-structure)
8. [API Reference](#api-reference)
9. [Security](#security)
10. [Azure Deployment](#azure-deployment)
11. [Testing Strategy](#testing-strategy)
12. [Known Limitations](#known-limitations)

## Architecture

```
Customer                Next.js App (App Router)              Azure
--------                ------------------------              -----
Scan QR  ─────────▶  /register  ──▶  participant JWT cookie
                     /upload    ──▶  upload-receipt API  ──▶  Blob Storage (receipt image)
                                                        ──▶  AI Document Intelligence (OCR)
                                                        ──▶  Fuzzy match + fraud engine (in-process)
                                                        ──▶  Azure SQL (Prisma)
                     /spin      ──▶  spin API (backend-authoritative, atomic inventory decrement)
                     /winner/:id

Admin                /admin/*   ──▶  JWT (httpOnly, SameSite=Strict) ──▶ dashboard, receipts,
                                                                          users, winners, settings
```

Key design decisions:

- **All verification and prize logic is server-side.** The wheel UI only renders whatever
  `/api/spin` returns — the frontend cannot influence or predict the outcome.
- **Prize inventory decrements are atomic** via conditional `updateMany` (`remainingStock: { gt: 0
  } }`) rather than read-then-write, so concurrent spins across multiple App Service instances can
  never oversell a prize.
- **Fuzzy brand matching** (`src/lib/matching/fuzzyMatch.ts`) uses normalized Levenshtein
  similarity across every OCR token, so "HAYATNA", "HYTNA", "HAYTNA", "HYATNA" and similar
  single/double-character OCR errors all resolve to the same brand with a confidence score —
  instead of brittle exact/substring matching.
- **A pluggable mock-cloud layer** (see below) lets the entire flow — OCR, blob storage — run
  fully offline for local development and CI, and switches to real Azure services the moment
  credentials are present in the environment. No code changes required to go from local dev to
  production.

## Local Setup

```bash
npm install
cp .env.example .env      # edit values as needed — defaults work out of the box in mock mode
npx prisma generate

# Requires a reachable SQL Server instance (see "Database" below)
npx prisma db push        # or: npm run prisma:migrate
npm run prisma:seed

npm run dev                # http://localhost:3000
```

Default seeded admin login (see `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`):
`admin@hayatna.ae` / `ChangeMe123!` — **change this immediately in any shared environment.**

## Environment Variables

See [`.env.example`](.env.example) for the full, documented list. Nothing is hardcoded — all
secrets are read from environment variables, which map to **Azure Key Vault references** in App
Service configuration in production (see [Azure Deployment](#azure-deployment)).

## Mock Cloud Mode vs. Real Azure

Set `USE_MOCK_CLOUD_SERVICES=true` (the default) to run the **entire** receipt flow without any
Azure credentials:

- **OCR** (`src/lib/azure/documentIntelligence.ts`): returns a deterministic synthetic result
  seeded from the uploaded file's SHA-256 hash, so the same file always produces the same result.
  ~70% of mock receipts include a Hayatna product (or always, if the filename contains "hayatna")
  so both the eligible and not-eligible UX paths are easy to demo.
- **Blob Storage** (`src/lib/azure/blobStorage.ts`): writes to `local-uploads/receipts/` and serves
  files back through an admin-only `/api/mock-blob/[...path]` route.

To switch to real Azure services, set `USE_MOCK_CLOUD_SERVICES=false` and provide:

- `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_DOCINTEL_ENDPOINT`, `AZURE_DOCINTEL_KEY` (an Azure AI Document Intelligence resource with
  the `prebuilt-receipt` model)

No other code changes are needed.

## Database

Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma), targeting the SQL Server provider
(Azure SQL Database in production). SQL Server doesn't support native enum types, so
status/role/type columns are plain strings validated against TS union types in
[`src/types/enums.ts`](src/types/enums.ts) at the API boundary (zod).

- **Migrations**: [`prisma/migrations/0001_init/migration.sql`](prisma/migrations/0001_init/migration.sql)
  was generated with `prisma migrate diff` and is ready to run against a fresh Azure SQL database
  via `npm run prisma:deploy`, or use `npm run db:push` for rapid local iteration.
- **Seed data**: [`prisma/seed.ts`](prisma/seed.ts) creates a default campaign, six prize tiers with
  inventory, a super-admin account, and a sample winning journey for dashboard demo purposes.
- Local development needs a reachable SQL Server. The quickest option is the official Docker
  image:
  ```bash
  docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 --name hayatna-sql -d mcr.microsoft.com/mssql/server:2022-latest
  ```

## Running Tests

```bash
npm test          # vitest run — fuzzy matching, eligibility, fraud rules, spin engine
npm run typecheck # tsc --noEmit
npm run lint      # next lint
npm run build     # production build (also type-checks and lints)
```

## Project Structure

```
src/
  app/
    page.tsx                    Home
    register/ upload/ spin/     Public campaign flow
    winner/[id]/                Winner confirmation
    terms/ privacy/             Legal pages
    admin/
      login/                    Public admin login
      (dashboard)/              Auth-guarded: dashboard, users, receipts, winners, settings
    api/                        All backend routes (see API Reference)
  components/
    home/ layout/ forms/ upload/ spin/ admin/ ui/
  lib/
    azure/                      Blob storage + Document Intelligence clients (+ mock providers)
    matching/fuzzyMatch.ts      Brand/product fuzzy matching
    eligibility/eligibilityEngine.ts
    fraud/fraudDetection.ts     Pure, unit-tested fraud rule engine
    spin/spinEngine.ts          Backend-authoritative, atomic prize selection
    validation/schemas.ts       zod schemas (shared client/server)
    auth.ts / jwt.ts            Admin + participant session JWTs, password hashing
    rateLimit.ts                Redis-backed (falls back to in-memory) sliding-window limiter
  middleware.ts                 CSRF origin check, admin route guard, CSP headers
prisma/
  schema.prisma / migrations / seed.ts
tests/                          Vitest unit tests for all pure business logic
infra/                          Azure Bicep templates
.github/workflows/              CI/CD pipeline
```

## API Reference

All endpoints return `{ success: boolean, ... }`. See [`docs/API.md`](docs/API.md) for full
request/response shapes.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Register a participant, issues session cookie |
| POST | `/api/upload-receipt` | participant | Upload + OCR + eligibility + fraud check |
| POST | `/api/verify-receipt` | participant | Poll verification result for a receipt |
| POST | `/api/spin` | participant | Backend-authoritative prize spin |
| GET | `/api/campaign` | — | Public campaign info |
| GET | `/api/prizes` | — | Public prize list (no odds/inventory exposed) |
| GET | `/api/winner/:id` | — | Public winner confirmation lookup |
| POST | `/api/admin/login` / `/logout` | — | Admin auth |
| GET | `/api/admin/dashboard` | admin | Stats, charts, prize inventory |
| GET | `/api/admin/users` \| `/receipts` \| `/winners` | admin | Paginated + searchable lists |
| PUT | `/api/admin/settings` | admin | Update thresholds, min purchase, submission limits |
| POST | `/api/admin/campaign/pause` \| `/resume` | admin | Toggle campaign status |
| POST | `/api/admin/prizes/reset-inventory` | super-admin | Reset stock + counters |
| POST | `/api/admin/receipts/:id/override` | admin | Manual approve/reject |
| DELETE | `/api/admin/receipts/:id` | admin | Delete a receipt |
| POST | `/api/admin/blacklist/user` \| `/receipt` | admin | Blacklist / restore |
| GET | `/api/admin/export/:type` | admin | CSV/XLSX export (users, receipts, winners) |

## Security

- **Transport & headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy (`next.config.js`) + a CSP applied in `middleware.ts`.
- **Auth**: admin sessions are httpOnly, `SameSite=Strict` JWTs (`jose`, HS256); participant
  sessions are httpOnly `SameSite=Lax` JWTs scoped to a single campaign entry. Passwords are
  hashed with bcrypt (cost factor 12).
- **CSRF**: SameSite cookie policy is the primary defense; `middleware.ts` adds an Origin-header
  check on all mutating API requests as defense-in-depth.
- **Input validation**: every request body is validated with zod (`src/lib/validation/schemas.ts`)
  before touching the database.
- **SQL injection**: 100% Prisma parameterized queries; the one raw SQL query (dashboard daily
  chart) uses a tagged-template `$queryRaw` (parameter-bound), never `$queryRawUnsafe` with string
  interpolation.
- **File upload security**: MIME type + 10 MB size check, then a magic-byte sniff
  (`file-type` / PDF header check) so a spoofed `Content-Type` can't smuggle disguised files
  through as a "receipt".
- **Rate limiting**: sliding-window limiter per IP/user on register, upload, spin, and admin login;
  Redis-backed when `REDIS_URL` is set (required for correctness across multiple App Service
  instances), in-memory fallback for local dev.
- **Fraud detection**: see `src/lib/fraud/fraudDetection.ts` — duplicate receipt number, duplicate
  image hash (SHA-256), daily submission caps, campaign/receipt date validation, minimum purchase
  amount, OCR confidence threshold, and a heuristic subtotal+tax-vs-total reconciliation check for
  possible tampering.
- **Audit logging**: every admin action (login, override, blacklist, settings change, export,
  campaign pause/resume, inventory reset) is recorded in `AuditLog`.
- Dependency audit: `npm audit` is clean of high/critical issues in the production dependency tree;
  the two remaining moderate advisories are inside Next.js's own bundled build-time `postcss`
  (not part of the served runtime) — see `npm audit` output for details, re-check on each Next.js
  patch release.

## Azure Deployment

See [`infra/main.bicep`](infra/main.bicep) for a template provisioning: App Service (Linux, Node
20), Azure SQL Database, Storage Account + private blob container, Azure AI Document Intelligence,
Key Vault, and Application Insights. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full
walkthrough and [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) for the CI/CD
pipeline (lint → typecheck → test → build → deploy).

## Testing Strategy

- **Unit tests** (`tests/`, Vitest): all pure business logic — fuzzy matching, eligibility
  decisions, fraud rules, weighted prize selection — is written as pure functions specifically so
  it can be tested without a database or network call. Run with `npm test`.
- **Type safety**: `tsc --noEmit` in CI catches contract drift between Prisma models, zod schemas,
  and API responses.
- **Manual/E2E** (not included, recommended next step): Playwright covering the full
  register → upload → spin → winner flow against mock-cloud mode, plus an admin-flow suite
  (login → override receipt → blacklist → export).

## Known Limitations

This is a complete, working reference implementation, not a live production deployment — a few
things are intentionally simplified and called out here rather than silently glossed over:

- **OCR/Blob Storage run in mock mode by default.** Real Azure Document Intelligence integration
  is fully implemented (`src/lib/azure/documentIntelligence.ts`) but requires your own Azure
  resource + credentials to exercise against real receipts.
- **SMS/Email delivery** is stubbed — notifications are persisted to the `Notification` table and
  logged; wiring a real provider (e.g. Twilio, Azure Communication Services) is a small, isolated
  change in `src/lib/notifications.ts`.
- **Device fingerprinting** is a lightweight, dependency-free heuristic
  (`src/lib/deviceFingerprint.client.ts`), not a hardened commercial fingerprinting SDK.
- **Tamper detection** for edited receipt images is a heuristic (subtotal+tax vs. total
  reconciliation), not forensic image-forensics analysis.
- **Rate limiting correctness across multiple instances requires Redis** (`REDIS_URL`); without it,
  limits are enforced per-instance only.
