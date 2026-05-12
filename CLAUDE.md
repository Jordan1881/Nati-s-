# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is
A single-user web app for managing pre-orders at a Friday-only home restaurant.
The single user is the operator (the developer's uncle). Orders collected
Thursday by phone/WhatsApp; prints kitchen bons + customer slips Friday morning;
produces end-of-day summary. Hosted on Vercel; database on Supabase (PostgreSQL).

## Commands

```bash
# Run everything (frontend + backend concurrently)
npm run dev

# Run frontend only (Vite, port 5173)
npm run dev --workspace packages/frontend

# Run backend only (tsx watch, port 3000)
npm run dev --workspace packages/backend

# Build all packages in dependency order
npm run build

# Run all tests (shared + backend)
npm test

# Run tests for a single package
npm run test --workspace packages/backend
npm run test --workspace packages/shared

# Run a single test file
npx vitest run packages/backend/src/__tests__/orders.routes.test.ts

# Database migrations
npm run db:migrate --workspace packages/backend

# Seed database
npm run db:seed --workspace packages/backend
```

## Monorepo structure

```
packages/
  frontend/   React + Vite (port 5173, proxies /api, /auth, /print to :3000)
  backend/    Express + Node (port 3000)
  shared/     @natis/shared — types, activeSaleDate, formatCurrency/formatDate
api/          Vercel serverless entry point — re-exports the Express app from packages/backend
```

Shared package must be built before frontend or backend: `npm run build --workspace packages/shared`.

During dev, Vite proxies `/api/*`, `/auth/*`, and `/print/*` to `localhost:3000` — no CORS config needed locally.

## Environment variables

Required in `packages/backend/.env` for local dev:
```
DATABASE_URL=          # Supabase PostgreSQL connection string
APP_PASSWORD=          # Single shared operator password
COOKIE_SECRET=         # Secret for signing the session cookie
SUPABASE_URL=          # Needed only for backup route
SUPABASE_SERVICE_ROLE_KEY=  # Needed only for backup route
```

## Frontend routes

| Path | Page |
|------|------|
| `/` | Login |
| `/orders/today` | Orders list (current sale date) |
| `/orders/new` | Order entry form |
| `/orders/:id` | Order detail / edit |
| `/menu` | Menu admin |
| `/summary/today` | End-of-day summary |
| `/customers` | Customers list |
| `/customers/:phone` | Customer detail |

## Active sale date

`getActiveSaleDate()` from `@natis/shared` always returns the next upcoming Friday (or today if today is Friday). This is the date used for new orders and the "today" views — not the current calendar day.

## Backup

`GET /api/backup/run` exports all orders for the current date as JSON to Supabase Storage (`backups` bucket) and prunes files older than 12 weeks. Triggered automatically every Friday at 20:00 UTC by Vercel Cron (configured in `vercel.json`). Both `/api/*` and `/print/*` routes are auth-protected via `authMiddleware`.

## Stack (locked, do not change without explicit approval)
- Frontend: React 18 + TypeScript + Vite + Tailwind (RTL) + Zustand + TanStack Query + React Router
- Backend: Node.js + Express + TypeScript + Supabase (PostgreSQL) + Drizzle ORM + Zod
- Print: server-rendered HTML via react-dom/server, A4 CSS @page
- Auth: single shared password + signed cookie (secure, HTTPS via Vercel)
- Deploy: Vercel (serverless), Supabase for database, Vercel Cron for scheduled jobs

## Architecture

**Auth**: `APP_PASSWORD` env var. POST `/auth/login` sets a signed `natis-session` cookie (30d, httpOnly). All `/api/*` routes check this cookie via `packages/backend/src/middleware/`.

**Database**: Drizzle ORM with PostgreSQL. Schema in `packages/backend/src/db/schema.ts`. Three tables: `menuItems`, `orders`, `orderLines`. Order creation is a single DB transaction (computes `dailyNumber` + inserts order + inserts lines atomically).

**Snapshot fields**: `orderLines` stores `itemNameSnap`, `priceSnap`, `unitLabelSnap`, `categorySnap` frozen at order time — menu changes don't affect historical orders.

**Frontend state**: TanStack Query for all server state. Zustand for client-only state. UI is Hebrew-only, `dir="rtl"`, Tailwind logical properties throughout (`ms-*`, `me-*`, `ps-*`, `pe-*` — not `ml-*`, `mr-*`).

**Testing**: Vitest across all packages. Backend tests use `supertest` for routes and `vi.mock()` for services. Test env vars set in `packages/backend/src/test-setup.ts`. No frontend tests currently.

## Critical architectural decisions (DO NOT relitigate)
1. Each menu-item size is its own row (Option A from grilling). NOT a variants table.
2. `order_lines` has snapshot fields frozen at order time.
3. `order_date` = the sale Friday, not the entry day.
4. `daily_number` resets per `order_date`; global `id` is the system identity.
5. No `customers` table — customer is derived via `GROUP BY customer_phone`.
6. `payment_method` ("cash"|"credit"|"bit"|"paybox"|"check"|NULL) and `payment_status` ("paid"|"unpaid"|NULL) are SEPARATE columns.
7. Soft delete on menu items (`active=0`). Hard delete on orders.
8. Last-write-wins concurrency. No optimistic locking.
9. Hebrew only, RTL throughout. Tailwind logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`).
10. Zero AI features in v1. Don't suggest adding any.

## Out-of-scope (do not propose)
See `docs/07-out-of-scope.md`. Includes: SMS notifications, online payments,
multi-user, native mobile apps, kitchen display screens, inventory tracking,
analytics dashboards, AI features, i18n framework, Docker.

## Working agreements
- Read the relevant doc in `docs/` before starting any non-trivial task.
- When you encounter ambiguity, ask before guessing — if it's not in the spec, raise it as an open question.
- Always use Drizzle for DB access. Never raw SQL strings outside migrations.
- Validate all API inputs with Zod. Share types via `@natis/shared`.
- Hebrew UI strings are inline in components. No i18n framework.

## Reference
- Full spec: `docs/01`–`09` (product spec, data model, API spec, screens/flows, print spec, policies, out-of-scope, deployment, definition of done).
- `docs/09-definition-of-done.md` — check before marking any feature complete.
- The grilling conversation that produced this spec is the source of truth for the *reasoning* behind decisions.
