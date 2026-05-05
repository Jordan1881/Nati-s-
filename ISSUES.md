# NATI's v1 — Issue Breakdown

12 vertical slices. Each slice is a thin, demoable cut through all relevant layers.
Publish to GitHub issues when repo is ready; labels: `needs-triage`.

---

## Issue 1 — Repo skeleton + RTL baseline

### What to build

Bootstrap the monorepo so every subsequent slice has a runnable foundation. By the end of this slice, `npm run dev` starts both servers and renders a single Hebrew RTL page that proves the bidi layout and font pipeline work before any real feature code lands.

### Acceptance criteria

- [ ] `natis/` root `package.json` defines `packages/*` workspaces
- [ ] `packages/backend`, `packages/frontend`, `packages/shared` all exist with their own `package.json` and `tsconfig.json`
- [ ] `packages/shared` exports at least a placeholder `types.ts`
- [ ] Vite dev server starts on `localhost:5173`; Express starts on `localhost:3000`
- [ ] Vite proxies `/api/*` and `/print/*` to Express in development
- [ ] `<html dir="rtl" lang="he">` renders a single Hebrew heading — confirmed RTL layout in browser
- [ ] Tailwind configured with logical properties; `ms-*`, `me-*`, `ps-*`, `pe-*` all resolve correctly
- [ ] ESLint + Prettier configured; lint passes clean
- [ ] Vitest (or equivalent) configured in both `backend` and `frontend` packages; `npm test` returns 0 with a placeholder test
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `.env`, `.DS_Store`
- [ ] `.env.example` committed with placeholder values for all required secrets

### Blocked by

None — can start immediately.

---

## Issue 2 — Schema, migrations, seed

### What to build

Define the full PostgreSQL schema in Drizzle, generate committed migrations, and seed NATI's menu. By the end of this slice, `db:migrate && db:seed` runs clean against a fresh Supabase database and a `SELECT * FROM menu_items` returns the full NATI's menu.

### Acceptance criteria

- [ ] `packages/backend/src/db/schema.ts` defines `menu_items`, `orders`, `order_lines` exactly matching `docs/02-data-model.md`
- [ ] `menu_items`: `id SERIAL PK`, `name TEXT`, `category TEXT`, `unit_label TEXT NULL`, `price NUMERIC(10,2)`, `active BOOLEAN DEFAULT TRUE`, `display_order INT DEFAULT 0`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- [ ] `orders`: `id SERIAL PK`, `daily_number INT`, `order_date DATE`, `customer_name TEXT`, `customer_phone TEXT`, `pickup_time TEXT NULL`, `status TEXT NULL`, `payment_method TEXT NULL`, `payment_status TEXT NULL`, `notes TEXT NULL`, `total_price NUMERIC(10,2)`, `kitchen_printed_at TIMESTAMPTZ NULL`, `customer_printed_at TIMESTAMPTZ NULL`, `created_at/updated_at TIMESTAMPTZ`
- [ ] `order_lines`: `id SERIAL PK`, `order_id INT FK → orders(id) ON DELETE CASCADE`, `menu_item_id INT FK → menu_items(id)`, `quantity INT`, `item_name_snap TEXT`, `unit_label_snap TEXT NULL`, `price_snap NUMERIC(10,2)`, `category_snap TEXT`
- [ ] `UNIQUE (order_date, daily_number)` constraint on `orders`
- [ ] Drizzle migration files committed in `packages/backend/drizzle/`
- [ ] `npm run --workspace packages/backend db:migrate` applies cleanly to a fresh Supabase project
- [ ] Seed script (`db/seed.ts`) populates all NATI's menu items from `docs/02-data-model.md` section on seed data; `display_order` respected; `unit_label` nullability works
- [ ] `npm run --workspace packages/backend db:seed` runs without error

### Blocked by

Issue 1

---

## Issue 3 — Auth: login/logout + cookie middleware

### What to build

Single shared-password authentication. `POST /auth/login` sets a signed session cookie; all `/api/*` and `/print/*` routes reject 401 without it. A minimal login screen in the frontend lets the operator authenticate.

### Acceptance criteria

- [ ] `POST /auth/login` with correct `APP_PASSWORD` returns `204` and sets a signed `httpOnly`, `sameSite: lax`, `secure: true`, 30-day cookie
- [ ] `POST /auth/login` with wrong password returns `401`
- [ ] `POST /auth/logout` clears the cookie and returns `204`
- [ ] Auth middleware applied to all `/api/*` and `/print/*` routes; any request without a valid cookie returns `401`
- [ ] Cookie signed with `COOKIE_SECRET` env var; tampered cookies rejected
- [ ] Frontend login screen: single password field + submit button; on success navigates to `/orders/today`; on failure shows error message
- [ ] Cookie persists across browser restarts (confirmed by closing and reopening the tab)
- [ ] Integration tests: rejected without cookie, accepted with valid cookie, rejected with tampered cookie

### Blocked by

Issue 1

---

## Issue 4 — Menu items CRUD: API + admin screen

### What to build

All five menu endpoints plus a fully functional menu admin screen. The operator can add, edit, reorder, and deactivate menu items. Deactivated items disappear from the order entry grid (enforced once that screen exists) but remain visible in admin with a faded style.

### Acceptance criteria

- [ ] `GET /api/menu-items` returns all items sorted by `(category, display_order, id)`; `?active=true/false` filter works
- [ ] `GET /api/menu-items/:id` returns single item; `404` if not found
- [ ] `POST /api/menu-items` creates item; Zod validates required fields; returns `201`
- [ ] `PATCH /api/menu-items/:id` updates any subset of fields; returns `200`; `404` if not found
- [ ] `DELETE /api/menu-items/:id` soft-deletes (`active = false`); returns `204`; `404` if not found
- [ ] Tests cover: happy path, invalid input → `400` with field details, soft-delete preserves row
- [ ] Frontend menu admin screen: three category sections in order (תבשילים, חומוס, סלטים)
- [ ] Items within each section sorted by `display_order`
- [ ] "הוסף פריט" modal: saves new item and item appears immediately in list
- [ ] Edit item modal: saves correctly; changes reflect immediately
- [ ] Active toggle: deactivates / reactivates item via `PATCH`
- [ ] Drag-reorder updates `display_order` via `PATCH` on drop
- [ ] No hard-delete affordance exposed in UI
- [ ] Deactivated items shown with faded style + "השב" reactivation button

### Blocked by

Issues 2, 3

---

## Issue 5 — Create order: POST endpoint + order entry screen

### What to build

The core tracer bullet. The `POST /api/orders` endpoint handles the full atomic transaction. The order entry screen is the most-used screen in the app — phone lookup, returning-customer banner, menu grid, cart with steppers, payment radio, and Save / Save+Print buttons.

### Acceptance criteria

- [ ] `POST /api/orders` runs atomically: verifies each `menu_item_id` is `active = true`, snapshots `name/unit_label/price/category` into each line, computes `total_price = SUM(quantity × price_snap)`, computes `daily_number = COALESCE(MAX, 0) + 1` for the `order_date`, inserts `orders` then `order_lines`, returns full order shape
- [ ] `400` returned for inactive/missing menu items, empty lines array, missing required fields
- [ ] `UNIQUE (order_date, daily_number)` constraint never violated under concurrent inserts
- [ ] Tests: snapshot fields are independent of subsequent menu price/name changes; `daily_number` increments correctly per `order_date` (not globally); `total_price` matches manual calculation
- [ ] `GET /api/orders` (no params) returns active sale date's orders sorted by `(order_date DESC, daily_number ASC)`
- [ ] Frontend order entry screen: phone field with debounced lookup (300ms, fires at 7+ digits)
- [ ] Returning-customer banner appears with [השתמש בפרטים] button that auto-fills name
- [ ] Menu grid shows active items grouped by category tabs; inactive items hidden
- [ ] Tapping a menu item adds it to cart at quantity 1; +/- steppers work; reaching 0 removes line
- [ ] Cart panel updates totals live; sticky on screen
- [ ] `order_date` pre-filled with active sale date (next upcoming Friday); operator can override
- [ ] `pickup_time` defaults to `09:30`
- [ ] Payment radio defaults to "טרם" (`payment_method = null, payment_status = null`); selecting מזומן/אשראי sets both method and `payment_status = "paid"`
- [ ] Form blocked on submit when name, phone, or cart is empty
- [ ] `שמור` saves and navigates to today's list with success toast
- [ ] `שמור והדפס` saves and opens `/print/order/:id` in a new tab (print is slice 7; this button can navigate to the URL; auto-trigger added in slice 7)
- [ ] Fully usable on ≤ 414px wide screen; touch targets ≥ 44×44px; no horizontal scroll

### Blocked by

Issues 2, 3, 4

---

## Issue 6 — Orders list + order detail/edit + delete

### What to build

The full order lifecycle after creation: listing orders with filters, viewing and editing an order's header or lines, and hard-deleting with two-step confirmation.

### Acceptance criteria

- [ ] `GET /api/orders?date=YYYY-MM-DD` and `?from=&to=` and `?phone=` filters all work
- [ ] `PATCH /api/orders/:id` updates any subset of header fields; `order_date` and `daily_number` are immutable; returns full order; `404` if not found
- [ ] `PUT /api/orders/:id/lines` replaces all lines atomically: deletes existing, re-snapshots fresh values from menu_items, inserts new lines, recomputes `total_price`, updates `updated_at`; returns full order; `400` for inactive/missing items
- [ ] `DELETE /api/orders/:id` hard-deletes; `ON DELETE CASCADE` removes lines; `204`; `404` if not found
- [ ] Tests: edit lines → total recomputes; delete → cascades to lines → summary reflects deletion
- [ ] Orders list screen: defaults to active sale date; date picker switches date
- [ ] Filter pills — הכל / לא שולמו / לא הודפסו — work correctly
- [ ] Per-row badges: paid status with method, print status; update when data changes
- [ ] Clicking row opens `/orders/:id`
- [ ] Order detail screen: view mode and edit mode toggle
- [ ] Edit mode: customer info, pickup time, status, payment, notes save via PATCH; reflect immediately
- [ ] Edit mode: line editing (add/remove items, change qty) saves via PUT; `total_price` updates in UI
- [ ] Delete button shows two-step confirmation dialog with customer name and total before calling DELETE
- [ ] All screens usable on mobile (≤ 414px, 44px touch targets, no horizontal scroll)

### Blocked by

Issue 5

---

## Issue 7 — Print pipeline: kitchen bon + customer slip + bonim file

### What to build

Server-rendered A4 print views for all three print scenarios: combined order (kitchen + customer), individual reprints, and the end-of-day bonim archive file. First print sets the `*_printed_at` timestamps; re-prints do not.

### Acceptance criteria

- [ ] `KitchenBon` React component: order number, pickup time, items grouped by category, notes (if any), entry timestamp. Excludes customer name, phone, prices.
- [ ] `CustomerSlip` React component: restaurant header, order number, customer name, phone, pickup time, line items with prices, total, payment confirmation when paid. Excludes status and entry timestamp.
- [ ] `packages/backend/src/routes/print.ts` renders components via `react-dom/server` and returns `text/html` with `dir="rtl"`, A4 `@page` CSS
- [ ] `GET /print/order/:id`: combined bon + slip with `page-break-after: always`; first call where either `*_printed_at` is NULL sets it to now; re-renders do not update existing timestamps
- [ ] `GET /print/order/:id/kitchen`: kitchen only; same timestamp logic
- [ ] `GET /print/order/:id/customer`: customer only; same timestamp logic
- [ ] `GET /print/bonim/:date`: all kitchen bons for date ordered by `daily_number ASC`, each on own page; does NOT update `kitchen_printed_at`; `400` on bad date format; `200` with empty-state message when no orders
- [ ] `404` returned from all routes when order not found
- [ ] `שמור והדפס` button on order entry screen triggers `window.print()` on the combined route
- [ ] Re-print buttons on order detail page ([הדפס שוב — בון מטבח], [הדפס שוב — שובר לקוח], [הדפס שניהם]) all work and do NOT update print timestamps
- [ ] Phone numbers and times render LTR within RTL context (`dir="ltr"` on those elements)
- [ ] Currency rendered via `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })`
- [ ] Print smoke test: combined print produces two separate A4 sheets with correct Hebrew rendering (no boxes, no missing glyphs)

### Blocked by

Issue 5

---

## Issue 8 — Edit-after-print banner

### What to build

Frontend-only feature. When an order that has been printed is subsequently edited in a way that affects what the kitchen cooks (lines or notes changed), the order detail screen shows a prominent banner with a one-click reprint button. Both kitchen and customer banners can render simultaneously.

### Acceptance criteria

- [ ] When `orders.updated_at > kitchen_printed_at` (and `kitchen_printed_at` is not NULL), kitchen-bon banner appears on order detail screen
- [ ] When `orders.updated_at > customer_printed_at` (and `customer_printed_at` is not NULL), customer-slip banner appears
- [ ] Both banners render simultaneously when both conditions are true
- [ ] Banner text: "⚠️ ההזמנה עודכנה אחרי הדפסה — יש להדפיס מחדש את הבון לבישול" (kitchen) / equivalent for customer slip
- [ ] Reprint button in each banner opens the matching print route and triggers print dialog
- [ ] Banners appear after editing lines or notes on a previously printed order
- [ ] Editing only header fields (status, payment method) still triggers banner if `updated_at` advances — implementation note: coarser `updated_at` comparison is acceptable; document the chosen approach

### Blocked by

Issues 6, 7

---

## Issue 9 — Daily summary: API + summary screen

### What to build

The end-of-day view. The `GET /api/summary/:date` endpoint aggregates all orders for a date into payment breakdowns, per-item totals, and rolled-up parent-name totals. The summary screen displays all of this plus export and print-archive buttons.

### Acceptance criteria

- [ ] `GET /api/summary/:date` returns: `order_count`, `total_revenue` (all orders, paid or not), `payment_breakdown` (cash, credit, unpaid with `order_ids`), `items_sold` (one entry per `menu_item_id`), `items_rolled_up` (GROUP BY `item_name_snap, category_snap`)
- [ ] `payment_breakdown.cash`: method=cash AND status=paid; `credit`: method=credit AND status=paid; `unpaid`: status NOT paid (null or "unpaid")
- [ ] Zero-orders date returns valid shape with zero counts and empty arrays
- [ ] `400` on invalid date format
- [ ] Tests: payment breakdown sums correct; `items_rolled_up` groups correctly across `unit_label` variants; unpaid order IDs match actual unpaid orders
- [ ] Summary screen: headline numbers (order count, revenue, unpaid count) correct against test data
- [ ] Payment breakdown table with cash/credit/unpaid rows and totals
- [ ] `items_sold` table with per-row breakdowns
- [ ] `items_rolled_up` table correctly groups by name
- [ ] Unpaid order rows link to `/orders/:id`
- [ ] [הדפס קובץ בונים של היום] opens `/print/bonim/:date` and triggers print
- [ ] [יצוא JSON] downloads a valid JSON file containing all orders and lines for the date
- [ ] Summary screen readable on mobile (≤ 414px, no horizontal scroll)

### Blocked by

Issue 5

---

## Issue 10 — Customer search + history: API + screens

### What to build

Customer-derived entity. Both endpoints query `orders` directly — no customers table. List/search screen with typeahead, and a single-customer history page with stats and recent orders.

### Acceptance criteria

- [ ] `GET /api/customers` returns list sorted by `order_count DESC`; `?search=` matches name and phone (case-insensitive substring); `?sort=spent` sorts by `total_spent DESC`; `?limit=N` respected (default 50, max 200)
- [ ] `GET /api/customers?phone=:phone` returns full history: most-recent name, `order_count`, `first_seen`/`last_seen`, `total_spent`, `favorite_items` (top 5 by quantity, grouped by `item_name_snap, unit_label_snap`), `recent_orders` (last 5, sorted by `order_date DESC, daily_number DESC`)
- [ ] `GET /api/customers?phone=:phone` returns `404` when no orders match the phone
- [ ] Tests: favorites ordered by quantity; `total_spent` correct; 404 on unknown phone
- [ ] Customers list screen: typeahead search updates results as operator types
- [ ] Sort toggle (לפי הזמנות / לפי סכום) reorders results correctly
- [ ] Clicking a customer row navigates to `/customers/:phone`
- [ ] Single customer page: correct stats (order count, total spent, first/last seen, top-5 favorites, last-5 recent orders)
- [ ] Recent-order rows link to `/orders/:id`

### Blocked by

Issue 5

---

## Issue 11 — Vercel Cron backup job

### What to build

Automated Friday-night backup to Supabase Storage. `GET /api/backup/run` exports all orders + lines for today's date as JSON, stores to `backups/orders-YYYY-MM-DD.json`, and prunes files older than 12 weeks. Triggered by Vercel Cron every Friday at 20:00 UTC (23:00 Israel Summer Time).

### Acceptance criteria

- [ ] `GET /api/backup/run` queries all orders + lines for today's `order_date`
- [ ] JSON file written to Supabase Storage at `backups/orders-YYYY-MM-DD.json`
- [ ] Files older than 12 weeks pruned after each successful write
- [ ] Failures logged to Vercel function logs but do not affect app availability
- [ ] `vercel.json` cron config: `{ "path": "/api/backup/run", "schedule": "0 20 * * 5" }`
- [ ] Manual trigger (`GET /api/backup/run` in browser or curl) produces the file in Supabase Storage and returns `200`
- [ ] Auto-prune confirmed: creating more than 12 fake weekly files and triggering the job leaves exactly 12

### Blocked by

Issues 2, 3

---

## Issue 12 — Production deploy + operator handoff

> **Type: HITL** — requires physical printer access and operator participation.

### What to build

Ship to production and hand off to the operator. Everything is wired up, bookmarked on both devices, and verified on a real A4 printer with Hebrew rendering. Restore procedure tested against a staging Supabase project.

### Acceptance criteria

- [ ] Vercel project linked to GitHub repo and auto-deploying from main branch
- [ ] All env vars set in Vercel dashboard: `APP_PASSWORD`, `COOKIE_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ACTIVE_SALE_WEEKDAY`
- [ ] Production Supabase: migrations applied, menu seed run, automated daily backups confirmed active in dashboard
- [ ] No secrets committed to repo at any point in history
- [ ] No real customer data committed to repo
- [ ] Vercel deployment URL accessible and login works
- [ ] Operator bookmarked on laptop browser; logged in
- [ ] Operator bookmarked / added to home screen on phone; logged in
- [ ] Print smoke test: fake order created → [שמור והדפס] → two A4 sheets emerge correctly, Hebrew renders without missing glyphs
- [ ] Restore procedure tested at least once against a staging Supabase project; app works with restored data
- [ ] `README.md` complete: product summary, architecture, quick start, deploy, backup/restore, portfolio "Why these choices" section, at least one RTL screenshot with synthetic data
- [ ] `CLAUDE.md` at repo root reflects current build status and locked decisions
- [ ] **Headline criterion:** operator completes one full Friday cycle (Thursday entry → Friday morning prints → end-of-day summary) without opening the notebook

### Blocked by

All previous issues

---

## Dependency graph (quick reference)

```
1 (skeleton)
├── 2 (schema)      → 4 (menu CRUD) → 5 (create order) → 6 (list/detail/edit)
│                                                        → 7 (print)          → 8 (banner)
│                                                        → 9 (summary)
│                                                        → 10 (customers)
└── 3 (auth)        → 4, 5, 11 (backup)
```

Issues 6, 7, 9, 10, 11 can all run in parallel once their blockers are done.
