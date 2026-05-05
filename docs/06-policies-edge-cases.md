# 06 — Policies and Edge Cases

This document specifies the policies the app applies in non-obvious
situations: time and date handling, edits and deletes, concurrency,
network behavior, security, failure modes, and backups.

These were resolved deliberately during product grilling. Each policy is
a load-bearing decision — overriding any of them requires explicit
re-grilling, not casual reinterpretation.

---

## 1. Time, dates, and the sale day

### 1.1 The "active sale date"

There is **no concept of "today"** anywhere in the app. Every place that
would otherwise default to `today` defaults instead to the **active sale
date**:

> The next upcoming Friday.
>
> - If today is Saturday through Thursday: active sale date = the next
>   Friday.
> - If today is Friday: active sale date = today.

This is computed in one helper function (`getActiveSaleDate()`) and
called everywhere a default date is needed. The frontend and backend
must agree on the same definition; share the helper across packages
(via a shared utilities module) rather than duplicating it.

The order entry form, today's orders list, and daily summary all default
to this date. A date picker in the top-end of list/summary screens lets
the operator switch to any other date.

**Consequence:** Saturday morning, the app already shows next Friday's
date. There is no awkward "Friday's data displays Saturday" state.

### 1.2 Order date is freely chosen

The order entry form pre-fills `order_date` with the active sale date
but the operator can change it to any date. Use case: a customer calls
Thursday saying *"actually, I want to pre-order for the Friday after
next."* No validation, no warnings, no business rule prevents this.

### 1.3 No time-based edit lock

Orders are editable indefinitely after their `order_date` passes. There
is no "freeze date" or "books closed" concept. Saturday, Sunday, three
weeks later — the operator can still edit any order.

This is appropriate for a single-user trust system. It is not appropriate
for a regulated POS, but NATI's is not a regulated POS.

The `updated_at` column tracks every modification. The order detail
screen may show *"עודכן לאחרונה ב-..."* as a soft signal but no hard
lock applies.

### 1.4 `pickup_time` is unvalidated

`pickup_time` is `TEXT`, typically `"HH:MM"`, but the column accepts:

- Standard `"09:30"` format (the dominant case).
- Empty / `NULL` (the operator left it blank).
- Anything else the operator types (`"10 בבוקר"`, `"בערב"`, etc.).

The app does not validate, normalize, or enforce business hours. It
does not compare `pickup_time` to current time. The form's default is
`09:30`, but everything else is the operator's call.

For sorting in list views, treat non-`HH:MM` values as *last* (after
all valid times) and treat `NULL` as last as well.

---

## 2. Edits, deletes, and the audit-vs-simplicity tradeoff

### 2.1 Hard delete of orders

`DELETE /api/orders/:id` permanently removes the order and (via
`ON DELETE CASCADE`) its lines. There is no `deleted_at` column and no
"trash" / undo feature.

**Why hard delete:** the daily summary aggregates from live data. A
deleted order should genuinely disappear from totals. Soft deletes
would either pollute totals (bad) or require WHERE-clauses everywhere
(over-engineering for this scale).

**Required safeguard:** the UI MUST show a confirmation dialog
displaying the customer name and order total before calling
`DELETE /api/orders/:id`. Two-step deletion is non-negotiable.

### 2.2 Soft delete of menu items

`DELETE /api/menu-items/:id` sets `active = 0`. The row is preserved.

**Why soft delete:** historical `order_lines.menu_item_id` references
must remain valid. Even though `order_lines` carries snapshots and
could in principle survive a hard delete, breaking the FK creates
analytics dead-ends and is unnecessary risk.

The UI presents this action as **"השבת"** (deactivate), not "מחק"
(delete). Deactivated items disappear from the order entry grid but
remain in the menu admin screen with a faded style and a "השב" button
to reactivate.

### 2.3 Menu price changes don't touch history

When the operator changes a menu item's `price` via
`PATCH /api/menu-items/:id`, **historical orders are unaffected**.
Their `order_lines.price_snap` was frozen at order creation time.

This is the snapshot pattern doing its job. No prompt, no warning, no
"do you want to update existing orders?" — the answer is always no.

### 2.4 Menu name changes don't touch history

Same as price. Historical orders display the name they were sold
under (`item_name_snap`).

**Caveat for `items_rolled_up` (daily summary):** the parent-name roll-up
groups by `item_name_snap`. If a menu item is renamed mid-year (e.g.,
*ברסקט עגל* → *ברסקט בקר*), the daily summaries before and after the
rename will show two separate rolled rows. We accept this. Renames are
rare and the alternative ("rename also rewrites history") is worse.

### 2.5 Order edits after print: the nag, not the gate

When a printed order is edited in a way that changes what the kitchen
needs to cook (lines or notes change), the order detail screen shows a
banner:

> ⚠️ **ההזמנה עודכנה אחרי הדפסה — יש להדפיס מחדש את הבון לבישול**
> [הדפס שוב את בון המטבח]

Detection logic: compare `orders.updated_at` to
`orders.kitchen_printed_at`. If `updated_at > kitchen_printed_at`, show
the banner.

The same applies to `customer_printed_at` for the customer slip.
Render both banners stacked if both apply.

**The app does NOT:**
- Auto-reprint.
- Refuse the edit.
- Prevent saving.
- Show modal blockers.

**The app DOES:**
- Make it impossible for the operator to forget that a re-print is
  needed.
- Provide a one-click reprint button in the banner itself.

The operator is responsible for actually re-printing.

---

## 3. Concurrency

### 3.1 Last-write-wins, no optimistic locking

Two devices (laptop + phone) can both connect to the same backend over
the local Wi-Fi. If two PATCHes hit the same `orders.id` concurrently,
**the second write wins**.

There are no:
- ETag / `If-Match` headers.
- Version columns.
- Conflict resolution UIs.

**Why it's acceptable:** the operator is one person. The realistic
concurrent-edit scenario (one human on two devices making conflicting
changes within seconds) is vanishingly rare. The cost of building real
optimistic locking is high and the benefit is near zero.

### 3.2 Refresh on focus

To avoid stale views when the operator switches devices, the order list
and daily summary screens refetch their data on the `visibilitychange`
event (when the tab/window regains focus).

This solves ~90% of the perceived staleness problem at near-zero
implementation cost. Use TanStack Query's `refetchOnWindowFocus: true`
(its default).

### 3.3 Customer-history lookup performance

The `GET /api/customers?phone=...` endpoint runs `GROUP BY` over
`orders`. For the expected scale (~50 orders/Friday × 50 weeks = ~2,500
orders/year), this is sub-millisecond. No caching needed in v1.

The frontend debounces the auto-lookup on the order entry form by 300ms
after the last keystroke and only fires once 7+ digits are typed. If
the request takes longer than 1 second on bad Wi-Fi, the lookup gives
up silently — the operator types the name themselves.

### 3.4 Server availability

The backend runs on Vercel serverless infrastructure. There is no
laptop sleep concern — Vercel handles availability. The operator needs
an active internet connection on both the laptop and the phone.

---

## 4. Network and security

### 4.1 Single shared password

The app has one password, set via the `APP_PASSWORD` environment variable
in Vercel. The login screen has one field (password) and one button.

On submit, `POST /auth/login` validates and sets a signed long-lived
session cookie. All subsequent API calls require the cookie.

**Cookie config:**
- `httpOnly: true`
- `sameSite: 'lax'`
- `secure: true` (Vercel provides HTTPS on all deployments)
- `maxAge: 30 days`
- Signed with a server secret from the `COOKIE_SECRET` env var (set in Vercel).

The operator types the password once per device. After that, the cookie
persists.

### 4.2 No user accounts, no password reset, no rate limiting

- No registration flow.
- No forgot-password flow.
- No account management.
- No 2FA.
- No login attempt rate limiting beyond what Express middleware provides
  by default.

If the password is forgotten or compromised, the operator (or developer)
edits `.env` directly and restarts the server.

### 4.3 Internet hosting

The app is hosted on Vercel and served over HTTPS. Security is provided by:
- HTTPS on all requests (enforced by Vercel).
- The signed session cookie (`secure: true`, `httpOnly: true`).
- The single shared password protecting all routes.

The app is reachable from any device with internet. This is intentional —
the operator uses both his laptop and his phone. Network isolation is
replaced by auth-layer protection. The Vercel deployment URL should be
shared only with the operator.

### 4.4 PII handling

Customer phone numbers are PII. The operator should treat them as such:

- Database credentials must never be committed to the repo. They live in
  Vercel environment variables only.
- Real customer data must NEVER be committed to the repo (seed script
  uses synthetic data only).
- Portfolio screenshots use synthetic data.
- Don't log phone numbers in server logs at INFO level. Mask if logged
  for debugging (`050-***-4567`).
- Supabase stores data in its own managed infrastructure (eu-central region
  recommended given Israeli user base).

Israeli privacy law (חוק הגנת הפרטיות) applies to a database of customer
phone numbers in principle, but enforcement against home restaurants is
effectively zero. The above hygiene is sufficient for this scale.

---

## 5. Failure modes during a Friday

### 5.1 Printer offline

The browser's print dialog surfaces the error. The order is already
saved in the DB before any print is attempted (save and print are two
distinct operations from the backend's perspective).

**Recovery:** fix the printer, navigate to the order detail page, click
`[הדפס שניהם]`. Re-prints do not update the print timestamps.

The app does not detect or handle printer state. That's the OS's job.

### 5.2 Mid-write failure

PostgreSQL on Supabase uses atomic transactions. Any interrupted write
rolls back cleanly. The operator's next action will reflect the last
committed state.

**Worst case:** the most recent uncommitted edit is lost. The operator
notices on the next view and re-enters it. Acceptable.

### 5.3 Database infrastructure failure

Supabase is a managed service with its own redundancy and backups.
A Supabase outage is outside our control; the mitigation is their SLA
and our own Friday JSON export backup (section 6).

### 5.4 Internet outage

If the operator's home internet goes down, both the laptop and phone
lose access to the app.

**Recovery:** wait for the internet to restore and refresh the tab.
There is no offline mode (explicitly out of v1 scope — see
`docs/07-out-of-scope.md`). As a last resort, the operator reverts to
the notebook for the duration of the outage and re-enters orders when
connectivity is restored.

### 5.5 Browser storage cleared

The frontend stores no persistent client state. Zustand state is
in-memory only. Any session cookie loss requires re-login, which is a
single password entry. No real data is at risk.

### 5.6 Vercel function cold start or transient error

Vercel serverless functions may have cold starts on the first request
after a period of inactivity. TanStack Query's default retry behavior
handles transient errors.

The operator may need to refresh the tab manually if a request fails —
acceptable given the low request volume on a Friday.

---

## 6. Backups

### 6.1 Primary backup — Supabase automated backups

Supabase automatically backs up the database daily on paid plans.
The Supabase dashboard allows point-in-time recovery. This is the
primary protection against data loss and requires no code.

### 6.2 Secondary backup — Friday JSON export (Vercel Cron)

A Vercel Cron job runs **every Friday at 23:00 Israel time** (UTC+3 in
summer, UTC+2 in winter). The job:

1. Calls an internal API endpoint that queries all orders + lines for
   today's `order_date`.
2. Stores the resulting JSON in Supabase Storage as
   `backups/orders-YYYY-MM-DD.json`.
3. Prunes files older than 12 weeks.

Failures are logged to Vercel's function logs but do not affect the app.

### 6.3 Manual export path

A `[יצוא JSON]` button on the daily summary screen downloads a JSON
file of all orders for the date. The operator may save this to Google
Drive / email it to himself — manual, out-of-band.

### 6.4 What backups protect against

- Accidental data deletion (restore from Supabase backup or JSON export).
- Schema migration bugs (roll back via Supabase point-in-time recovery).
- Supabase account issues (JSON exports provide an independent copy).

### 6.5 Restore procedure

For a full database restore: use the Supabase dashboard point-in-time
recovery feature. For individual Friday data: import from the stored
JSON export. Document the exact steps in the deployment runbook
(`docs/08-deployment.md`).

---

## 7. Internationalization

### 7.1 Hebrew only

All UI strings are Hebrew. They live as inline literals in React
components. There is no i18n framework (`react-i18next`, `react-intl`,
`format.js`, etc.) in v1.

**Why:** the user is Hebrew-speaking, the developer is Hebrew-speaking,
and adding an i18n framework for a single-language app is a portfolio
trap — looks structured in code, costs time, no user benefit.

### 7.2 RTL is a first-class commitment

- `<html dir="rtl" lang="he">` at the root.
- Tailwind logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) — never
  `ml-*` / `mr-*` / `pl-*` / `pr-*`.
- Print HTML has its own `dir="rtl"` (CSS doesn't inherit across page
  boundaries — print CSS is its own world).
- Phone numbers and time fields use `dir="ltr"` inside RTL containers
  (numbers are LTR even in Hebrew text).
- Mixed Hebrew + numbers in lines like `2× ברסקט עגל 1 ק״ג — 220 ₪`
  let the browser's bidi algorithm handle them. Use `<bdi>` only if a
  specific render glitches.

### 7.3 Numbers and currency

- Stored as `REAL`. Don't store cents-as-integer (over-engineering for
  this scale).
- Format on display with `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })`.
- Format dates with `Intl.DateTimeFormat('he-IL')` and explicit
  `dateStyle: 'long'` or similar where needed.

---

## 8. Things this document does NOT decide

These are deliberately left out of the policy doc because they belong
elsewhere:

- **What features exist** — see `docs/01-product-spec.md`.
- **The schema** — see `docs/02-data-model.md`.
- **The API surface** — see `docs/03-api-spec.md`.
- **The screens and flows** — see `docs/04-screens-and-flows.md`.
- **The print pipeline** — see `docs/05-print-spec.md`.
- **What's explicitly NOT being built** — see `docs/07-out-of-scope.md`.
- **How to deploy and run the app** — see `docs/08-deployment.md`.
- **How we know we're done** — see `docs/09-definition-of-done.md`.

If a question arises about behavior in a situation not covered here,
**raise it as an open question rather than guessing**. Policy decisions
get added here only after explicit discussion.