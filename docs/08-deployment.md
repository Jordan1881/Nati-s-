# 08 — Deployment and Build Order

This document specifies how NATI's is built, deployed, and operated. The
frontend is hosted on Vercel. The database is on Supabase (PostgreSQL).
There is no local server process — everything runs on managed cloud infrastructure.

---

## 1. Repo layout

```
natis/
├── CLAUDE.md                        ← Agent standing instructions
├── README.md                        ← Human-facing overview
├── package.json                     ← Workspace root
├── vercel.json                      ← Vercel routing + cron config
├── .gitignore
├── .env.example                     ← Template; real secrets live in Vercel env vars
├── docs/                            ← This spec set
│   ├── 01-product-spec.md
│   ├── 02-data-model.md
│   ├── 03-api-spec.md
│   ├── 04-screens-and-flows.md
│   ├── 05-print-spec.md
│   ├── 06-policies-edge-cases.md
│   ├── 07-out-of-scope.md
│   ├── 08-deployment.md
│   └── 09-definition-of-done.md
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts             ← Express bootstrap (wrapped for Vercel)
│   │   │   ├── db/
│   │   │   │   ├── schema.ts        ← Drizzle schema (PostgreSQL)
│   │   │   │   ├── client.ts        ← Supabase pg + Drizzle init
│   │   │   │   └── seed.ts          ← Seed script (NATI's menu)
│   │   │   ├── routes/
│   │   │   │   ├── menu.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── summary.ts
│   │   │   │   ├── customers.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── backup.ts        ← Called by Vercel Cron (Friday 23:00)
│   │   │   │   └── print.ts         ← Server-rendered React via react-dom/server
│   │   │   ├── services/            ← Business logic (separated from routes)
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts
│   │   │   ├── lib/
│   │   │   │   └── activeSaleDate.ts
│   │   │   └── config.json          ← Restaurant metadata, default times
│   │   └── drizzle/                 ← Drizzle migrations (committed)
│   ├── frontend/
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/              ← React Router routes
│   │       ├── components/
│   │       │   ├── print/           ← KitchenBon, CustomerSlip, BonimFile
│   │       │   └── ...
│   │       ├── stores/              ← Zustand stores
│   │       ├── api/                 ← TanStack Query hooks
│   │       └── lib/
│   │           └── activeSaleDate.ts ← Same logic, shared via shared package
│   └── shared/
│       ├── package.json
│       ├── src/
│       │   ├── types.ts             ← Zod schemas + inferred TS types
│       │   ├── activeSaleDate.ts    ← Single source of truth
│       │   └── format.ts            ← Currency + date formatters
```

The `shared/` package exports types and shared utilities used by both
frontend and backend (Zod schemas, the active-sale-date helper, the
formatters). Both packages depend on `shared` via the workspace.

---

## 2. Stack inventory

| Layer | Choice | Notes |
|---|---|---|
| Build tool (frontend) | Vite | Fast HMR, ESM-native. |
| UI framework | React 18 + TypeScript | |
| Styling | Tailwind CSS | RTL-first; logical properties (`ms-*`, `me-*`). |
| Client state | Zustand | Order being composed, UI state. |
| Server state | TanStack Query | Refetch on focus enabled by default. |
| Routing | React Router | |
| Icons | lucide-react | No emojis in production UI. |
| Backend framework | Express + TypeScript | Deployed as Vercel serverless functions. |
| Database | PostgreSQL via Supabase | Managed, auto-backed-up, connection via `DATABASE_URL`. |
| ORM | Drizzle | Type-safe queries, schema-as-code, migrations CLI. |
| Validation | Zod | Schemas shared with frontend via `shared/`. |
| Server-side print | `react-dom/server` | Same React components used in SPA. |
| Auth | `cookie-session` or equivalent | Single signed cookie, `secure: true` (HTTPS). |
| Cron | Vercel Cron | Configured in `vercel.json`; runs Friday 23:00 backup job. |
| Hosting | Vercel | Serverless; auto-deploy from git push. |

---

## 3. Environment configuration

All secrets are set as **Vercel environment variables** (never committed).
For local development, a `.env` file in the repo root (gitignored) mirrors them.

`.env.example` (committed):

```bash
# Auth
APP_PASSWORD=change-me-before-deploying
COOKIE_SECRET=replace-with-a-long-random-string

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Supabase Storage (for backup JSON exports)
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Operational
ACTIVE_SALE_WEEKDAY=5    # 0=Sunday ... 5=Friday ... 6=Saturday
```

Set these in: Vercel Dashboard → Project → Settings → Environment Variables.
The frontend has no additional env requirements — it's served from the same
Vercel deployment, so there's no separate API base URL to configure.

---

## 4. .gitignore (committed at repo root)

```
node_modules/
dist/
build/
.DS_Store

# Env
.env
.env.local
*.env

# Logs
*.log
npm-debug.log*
```

---

## 5. Build and run — local development

From the repo root:

```bash
# One-time setup
npm install                                  # installs all workspaces
cp .env.example .env
# Edit .env: set APP_PASSWORD, COOKIE_SECRET, DATABASE_URL (point to Supabase)

# Database setup
npm run --workspace packages/backend db:migrate    # runs Drizzle migrations against Supabase
npm run --workspace packages/backend db:seed       # loads NATI's menu

# Run
npm run dev                                  # runs both packages concurrently
# Frontend on http://localhost:5173 (Vite dev server)
# Backend on http://localhost:3000 (Express)
# Vite dev server proxies /api/* and /print/* to the backend
```

---

## 6. Build and deploy — production (Vercel)

**First deploy:**

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (one-time)
vercel link

# Set environment variables in Vercel dashboard:
#   APP_PASSWORD, COOKIE_SECRET, DATABASE_URL,
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ACTIVE_SALE_WEEKDAY

# Run migrations against production Supabase
npm run --workspace packages/backend db:migrate

# Seed menu (first deploy only)
npm run --workspace packages/backend db:seed

# Deploy
vercel --prod
```

**Subsequent deploys:** push to the main branch — Vercel auto-deploys via
the GitHub integration.

Vercel serves:
- `GET /api/*` → Express routes as serverless functions
- `GET /print/*` → server-rendered HTML as serverless functions
- `GET /auth/*` → login/logout
- `GET /*` → static frontend build (React SPA with HTML5 history fallback)

Routing is configured in `vercel.json`.

---

## 7. Vercel configuration (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "packages/frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/packages/backend/dist/index.js" },
    { "source": "/print/(.*)", "destination": "/packages/backend/dist/index.js" },
    { "source": "/auth/(.*)", "destination": "/packages/backend/dist/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "crons": [
    {
      "path": "/api/backup/run",
      "schedule": "0 20 * * 5"
    }
  ]
}
```

The cron schedule `0 20 * * 5` is Friday 20:00 UTC, which is Friday 23:00
Israel Summer Time (UTC+3). Adjust to `0 21 * * 5` in winter (UTC+2).

---

## 8. Operator setup (one-time, after first deploy)

1. **Open the Vercel deployment URL** on the laptop browser. Log in with
   the shared password. Bookmark it.

2. **Bookmark the URL on the phone.** Open the phone's browser, navigate
   to the Vercel URL, log in once, bookmark / add to home screen.

3. **Verify the print pipeline.** Create a fake order, click `שמור
   והדפס`, confirm both A4 sheets emerge correctly with Hebrew rendering.

---

## 9. Backups

Specified in detail in `docs/06-policies-edge-cases.md` section 6.
Operationally:

- **Supabase automated daily backups** — primary protection. No action required.
- **Vercel Cron (Friday 23:00 IST)** — calls `GET /api/backup/run`, which
  exports all orders for the day as JSON and stores to Supabase Storage.
  Keeps last 12 weekly exports. Failures logged to Vercel function logs.
- **Manual export** — operator uses `[יצוא JSON]` on the daily summary screen.
  Document this in the README.

**Restore procedure:**

For full DB restore: use Supabase Dashboard → Backups → Point-in-time recovery.

For individual Friday data: download the JSON from Supabase Storage →
`backups/orders-YYYY-MM-DD.json` and re-import if needed.

Verify by viewing the daily summary for a recent date after restore.

---

## 10. Updating the deployed app

When code changes ship: push to the main branch. Vercel auto-deploys.

If migrations are included:

```bash
# Run against production Supabase BEFORE pushing the code change
npm run --workspace packages/backend db:migrate
```

**Before any migration**, verify a recent Supabase backup exists in the
dashboard, or take a manual snapshot first.

---

## 11. Build order (suggested implementation sequence)

This is a recommended order, not a contract. Each step should produce a
runnable, testable increment.

1. **Repo skeleton + tooling.**
   - Workspaces, TypeScript configs, Tailwind RTL config.
   - `<html dir="rtl" lang="he">` baseline; render a single Hebrew page
     to confirm RTL layout works.
   - Lint, format, basic test runner.

2. **Schema + migrations + seed.**
   - Drizzle schema matching `docs/02-data-model.md`.
   - Migrations generated and applied.
   - Seed script that populates the NATI's menu (transcribed from the
     menu picture into a JSON file).
   - Test: the schema round-trips correctly; `display_order` is
     respected; `unit_label` nullability works.

3. **Backend: menu endpoints + tests.**
   - `GET`, `POST`, `PATCH`, soft `DELETE` for `/api/menu-items`.
   - Validation with Zod.
   - Tests cover happy path, invalid input, soft-delete behavior.

4. **Backend: order endpoints + tests.**
   - `POST /api/orders` with snapshot population, `daily_number`
     computation, `total_price` calculation, all in one transaction.
   - `GET`, `PATCH`, `PUT lines`, hard `DELETE`.
   - Tests cover: snapshots are independent of subsequent menu
     changes; `daily_number` increments correctly; deleting cascades
     to lines; replace-all lines recomputes total.

5. **Backend: summary + customers endpoints + tests.**
   - `GET /api/summary/:date` with all sub-objects.
   - `GET /api/customers?phone=…` and `GET /api/customers`.
   - Tests cover: payment breakdown is correct; `items_rolled_up`
     groups correctly across `unit_label` variants; favorites are
     ordered by quantity.

6. **Auth and middleware.**
   - `POST /auth/login`, `POST /auth/logout`.
   - Cookie-based session middleware applied to all `/api/*` and
     `/print/*` routes.
   - Tests cover: rejected without cookie; accepted with valid cookie.

7. **Frontend: order entry screen.**
   - The most-used screen; build first.
   - Phone-first form; debounced customer-history lookup;
     returning-customer banner; menu grid with category tabs;
     stepper-driven cart; sticky cart panel; payment radio; save and
     save-and-print buttons.
   - Test by hand on the laptop and the phone (responsive).

8. **Frontend: orders list + order detail/edit + edit-after-print
   banner.**
   - Date picker, filter pills, row badges (paid / printed).
   - Order detail with view/edit modes.
   - Edit-after-print banner driven by `updated_at` vs.
     `*_printed_at`.

9. **Print views (server-rendered).**
   - `KitchenBon` and `CustomerSlip` components in the frontend
     codebase.
   - Server-rendered via `react-dom/server` in
     `packages/backend/src/routes/print.ts`.
   - Print CSS (`print.css`) with `@page A4`, RTL, page-break rules.
   - Combined route, individual routes, bonim file route.
   - Print smoke test on a real A4 printer with Hebrew rendering.

10. **Frontend: daily summary screen.**
    - Headline numbers, payment breakdown, items rolled up,
      `[הדפס קובץ בונים של היום]` button, `[יצוא JSON]` button.

11. **Frontend: customer search + history + menu admin.**
    - Tier 2 screens. Functional, not heavily polished.

12. **Backups + deployment runbook.**
    - Vercel Cron Friday 23:00 backup job wired up and verified.
    - Restore procedure tested at least once against a staging Supabase project.
    - Vercel deployment verified end-to-end (login → create order → print).

13. **Real Friday with the operator.**
    - Observe usage. Note frictions. Fix what breaks. Iterate.
    - Update `docs/` if any policy needs revision; do not silently
      change behavior without updating the docs.

---

## 12. README — what to write for humans

The repo's `README.md` should cover:

1. **One-paragraph product summary** (cribbed from
   `docs/01-product-spec.md`).
2. **Architecture summary** (1–2 paragraphs): local-first, single
   operator, Hebrew RTL, snapshot pattern in the schema, server-rendered
   print.
3. **Quick start for development** (section 5 above).
4. **Production deploy on the laptop** (section 6 above) and **network
   setup** (section 8 above).
5. **Backup and restore** (section 9 above).
6. **Pointer to `docs/`** for the full spec.
7. **Portfolio notes**: what was deliberately chosen and why (snapshot
   pattern, local-first, RTL-first, no AI in v1). This is the section
   that recruiters and hiring managers will skim. Make it strong.

---

## 13. What this document does NOT cover

- Schema details — see `docs/02-data-model.md`.
- API shapes — see `docs/03-api-spec.md`.
- UI specifications — see `docs/04-screens-and-flows.md`.
- Print layout — see `docs/05-print-spec.md`.
- Behavioral policies — see `docs/06-policies-edge-cases.md`.
- What's NOT being built — see `docs/07-out-of-scope.md`.
- Definition of done — see `docs/09-definition-of-done.md`.