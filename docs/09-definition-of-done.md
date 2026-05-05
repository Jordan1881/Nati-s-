# 09 — Definition of Done (v1)

This document defines what "done" means for v1. It is the acceptance
criteria the project is measured against. v1 is not done until every
item in section 1 is true.

A feature being implemented is not the same as v1 being done. Code
that is committed but not exercised in real use does not count.

---

## 1. The headline criterion

> **The operator uses the app for one full Friday cycle — Thursday
> entry through Friday morning prints through Friday end-of-day summary
> — without falling back to the notebook for any order.**

This is the only criterion that ultimately matters. Everything below
is a sub-condition that supports it.

If the operator opens the notebook even once during that Friday cycle,
v1 is not done. Find out why he reached for the notebook, fix the gap
in the app, and try again the following Friday.

---

## 2. Functional acceptance — what must work

### 2.1 Order entry

- [ ] The operator can create an order in under 60 seconds for a
      typical 4-line order, on both the laptop and the phone.
- [ ] Phone field auto-lookup surfaces returning customers within 1
      second on the local Wi-Fi.
- [ ] The returning-customer banner correctly auto-fills the name when
      `[השתמש בפרטים]` is pressed.
- [ ] Active menu items appear in the grid; inactive ones do not.
- [ ] Tapping an item adds it to the cart with quantity 1; the +/- 
      stepper works in both directions; reaching 0 removes the line.
- [ ] The cart panel updates totals live as items change.
- [ ] Order-level notes save and are visible on the kitchen bon.
- [ ] Payment radio defaults to `טרם`; selecting `מזומן`/`אשראי` sets
      both `payment_method` and `payment_status = "paid"` correctly.
- [ ] `שמור והדפס` saves the order and opens the combined print view
      with `window.print()` triggered automatically.
- [ ] `שמור` saves the order and returns to today's list with a
      success toast.
- [ ] Form submission is blocked when name, phone, or cart is empty.

### 2.2 Order list and detail

- [ ] Today's list defaults to the active sale date (next Friday).
- [ ] Date picker switches the displayed date.
- [ ] Filter pills (`הכל` / `לא שולמו` / `לא הודפסו`) work correctly.
- [ ] Per-row badges (paid status with method, print status) display
      correctly and update when underlying data changes.
- [ ] Clicking a row opens `/orders/:id`.
- [ ] The order detail screen toggles between view and edit modes.
- [ ] Editing customer info, pickup time, status, payment, and notes
      saves via PATCH and reflects immediately.
- [ ] Editing lines (replace-all) saves via PUT and recomputes
      `total_price` correctly.
- [ ] Re-print buttons (`[הדפס שוב — בון מטבח]`, `[הדפס שוב — שובר
      לקוח]`, `[הדפס שניהם]`) all work and do NOT update print
      timestamps.
- [ ] Delete button shows two-step confirmation with customer name and
      total before calling `DELETE /api/orders/:id`.

### 2.3 Edit-after-print banner

- [ ] When `orders.updated_at > kitchen_printed_at` and lines or notes
      changed, the kitchen-bon banner appears on the order detail.
- [ ] Same logic for `customer_printed_at` triggers the customer-slip
      banner.
- [ ] Both banners can render simultaneously when both apply.
- [ ] The reprint button in the banner opens the matching print route
      and triggers print.
- [ ] Editing only header fields (status, payment) does NOT trigger
      the banner — only line/notes changes do. (Implementation note:
      the banner trigger may be a coarser "any update" comparison if
      that's simpler, but the operator-facing behavior should match
      this rule. Document the chosen approach in code comments.)

### 2.4 Daily summary

- [ ] Headline numbers (order count, total revenue, unpaid count) are
      correct against test data.
- [ ] Payment breakdown sums match the orders for the date.
- [ ] `items_sold` shows per-row breakdowns matching `order_lines`.
- [ ] `items_rolled_up` correctly groups by `name` (ignoring
      `unit_label`).
- [ ] Unpaid order links navigate to the correct order detail.
- [ ] `[הדפס קובץ בונים של היום]` opens `/print/bonim/:date` and
      triggers print.
- [ ] `[יצוא JSON]` downloads a valid JSON file containing all orders
      and lines for the date.

### 2.5 Print pipeline

- [ ] `GET /print/order/:id` renders one HTML doc with kitchen bon and
      customer slip, separated by a working `page-break-after: always`.
- [ ] On a real A4 printer, the kitchen bon and customer slip emerge
      as two separate sheets, correctly oriented, with Hebrew text
      rendered properly (no missing glyphs, no boxes).
- [ ] Numbers (prices, phone, time) render LTR within RTL contexts.
- [ ] The kitchen bon includes order number, pickup time, items
      grouped by category, notes (if present), and entry timestamp,
      and EXCLUDES customer name, phone, and prices.
- [ ] The customer slip includes restaurant header, order number,
      customer name, phone, pickup time, line items with prices,
      total, and payment confirmation (when paid), and EXCLUDES status
      and entry timestamp.
- [ ] First print on a fresh order sets `kitchen_printed_at` and/or
      `customer_printed_at`. Re-prints do NOT update these fields.
- [ ] `GET /print/bonim/:date` renders all kitchen bons for the date,
      ordered by `daily_number ASC`, each on its own A4 page.
- [ ] An empty bonim file (no orders for the date) returns a valid
      page with the empty-state message.

### 2.6 Customer search and history

- [ ] Typeahead search matches both name and phone (case-insensitive
      substring).
- [ ] Sort toggle (orders / spent) reorders results correctly.
- [ ] Single customer page shows correct stats: order count, total
      spent, first/last seen, favorite items (top 5 by quantity),
      recent orders (last 5).
- [ ] Recent-order rows link to `/orders/:id`.
- [ ] Returns 404 for a phone with no orders.

### 2.7 Menu admin

- [ ] Three category sections render in order (תבשילים, חומוס, סלטים).
- [ ] Items within a section sort by `display_order`.
- [ ] Add new item modal saves and the new item appears immediately.
- [ ] Edit existing item modal saves correctly.
- [ ] Active toggle reflects on the order entry grid (deactivated
      items hidden from entry, still shown in admin).
- [ ] Drag-reorder updates `display_order` correctly via PATCH.
- [ ] No hard-delete affordance is exposed in the UI.

### 2.8 Auth

- [ ] `POST /auth/login` with the correct password sets a signed cookie.
- [ ] All `/api/*` and `/print/*` requests reject with 401 when cookie
      is missing or invalid.
- [ ] Cookie persists across browser restarts (long maxAge).
- [ ] `POST /auth/logout` clears the cookie.

---

## 3. Quality acceptance — non-functional

### 3.1 Architecture

- [ ] Schema matches `docs/02-data-model.md` exactly.
- [ ] All API endpoints from `docs/03-api-spec.md` exist with the
      specified shapes.
- [ ] Snapshot fields on `order_lines` are populated at order creation
      and never updated.
- [ ] `total_price` is recomputed by the server inside any transaction
      that mutates lines.
- [ ] `daily_number` is computed inside the same transaction as the
      INSERT, with `UNIQUE (order_date, daily_number)` enforced.
- [ ] Soft delete works correctly on `menu_items`; hard delete cascades
      correctly on `orders`.
- [ ] Drizzle migrations are committed; running `db:migrate` on a fresh
      DB produces the expected schema.

### 3.2 Tests

- [ ] Unit tests cover the business-logic layer:
      - `daily_number` computation
      - `total_price` calculation
      - Snapshot population on order creation
      - Snapshot independence after menu changes
      - Daily summary aggregation (per-row and rolled-up)
      - Customer history aggregation
      - Active sale date helper (every weekday)
- [ ] Integration tests cover the critical happy paths:
      - Create order → fetch order → totals match
      - Edit order lines → total recomputes
      - Delete order → cascades to lines → summary reflects deletion
      - Soft-delete menu item → hidden from entry, present in history
- [ ] Tests pass cleanly (`npm test` returns 0 in both packages).

### 3.3 RTL and locale

- [ ] `<html dir="rtl" lang="he">` is set at the root.
- [ ] No `ml-*`, `mr-*`, `pl-*`, `pr-*` Tailwind classes anywhere in
      production code (CI / lint check or manual grep).
- [ ] Currency renders via `Intl.NumberFormat('he-IL', { style:
      'currency', currency: 'ILS' })`.
- [ ] Dates render via `Intl.DateTimeFormat('he-IL')`.
- [ ] Phone numbers and time fields render LTR inside RTL contexts.
- [ ] Print HTML carries its own `dir="rtl"` (not inherited via CSS).

### 3.4 Mobile responsiveness

- [ ] Order entry is fully usable on a typical smartphone screen
      (≤ 414px wide).
- [ ] Order list and detail screens are usable on the phone.
- [ ] Daily summary is readable on the phone.
- [ ] No horizontal scroll on any screen at common phone widths.
- [ ] Touch targets are at least 44×44 px on mobile.

### 3.5 Resilience

- [ ] Vercel deployment survives a redeployment with no data loss (data
      lives in Supabase, not the function).
- [ ] A mid-write failure (simulated by killing a request) leaves the
      database in a consistent state (transaction rolled back).
- [ ] Vercel Cron backup job runs successfully when triggered manually
      via `GET /api/backup/run`.
- [ ] Supabase automated backup is confirmed active in the dashboard.
- [ ] Restore procedure tested at least once against a staging Supabase
      project and produces a working app with the restored data.
- [ ] Auto-prune correctly limits stored JSON exports to 12 weeks.

### 3.6 Security and privacy

- [ ] No database credentials or secrets have been committed to the repo.
- [ ] No real customer data has been committed to the repo at any
      point in history.
- [ ] `.env` is gitignored; `.env.example` is committed with placeholder values.
- [ ] All secrets are set as Vercel environment variables (not hardcoded).
- [ ] Auth cookie is configured `secure: true` (enforced by Vercel HTTPS).
- [ ] No phone numbers are logged at INFO level.

### 3.7 Operational

- [ ] Vercel project is deployed and the production URL is accessible.
- [ ] All environment variables are set in the Vercel dashboard.
- [ ] The phone has the Vercel URL bookmarked / on the home screen.
- [ ] The operator has logged in on both his laptop and phone.
- [ ] A print smoke test was successful on the real A4 printer.

---

## 4. Documentation acceptance

- [ ] `README.md` covers product summary, architecture summary, quick
      start, production deploy, network setup, backup/restore, and
      links to `docs/`.
- [ ] All `docs/01-` through `docs/09-` files exist and match the
      shipped behavior. If behavior diverged during implementation,
      the docs were updated to match.
- [ ] `CLAUDE.md` exists at the repo root with current build status
      and locked architectural decisions.
- [ ] No commented-out spec content. No `TODO` references to undecided
      design questions — all design questions either resolved or
      logged as v2 candidates.

---

## 5. Portfolio acceptance

NATI's is a portfolio piece as well as a working tool. v1 is not done
unless these are also true:

- [ ] The repo is public on GitHub.
- [ ] The README's first paragraph is the 90-second pitch from
      `docs/01-product-spec.md` section 6, refined into a single
      paragraph.
- [ ] The README has a "Why these choices" section explaining at
      minimum: snapshot pattern, local-first reasoning, RTL-first
      approach, no-AI commitment.
- [ ] At least one screenshot in the README (or a short demo GIF)
      using synthetic data, shown in Hebrew RTL.
- [ ] The codebase passes a self-audit: every architectural decision
      is one the developer can defend in an interview, not one made
      by accident.

---

## 6. Out-of-scope items are NOT criteria

Items listed in `docs/07-out-of-scope.md` are **not** required for v1
and must not be added to this checklist. If a temptation arises to
include "just one out-of-scope item" before declaring v1 done, follow
the escalation rule in `docs/07-out-of-scope.md` section 14.

The discipline of finishing v1 to spec is part of what this project
demonstrates.

---

## 7. The shipping ritual

Once every checkbox in sections 1–5 is true:

1. Tag the repo: `git tag v1.0 && git push --tags`.
2. Run the operator through one final live Friday (the headline
   criterion in section 1).
3. Write a short retrospective in `docs/retro-v1.md`: what was easier
   than expected, what was harder, what to take into v2 if there ever
   is one.
4. Decide what's next:
   - Stop and let v1 run for a few months. Observe. Iterate small.
   - OR begin a v2 scoping conversation if specific real needs
     emerged.
   - OR start a separate AI-focused project with the lessons learned.