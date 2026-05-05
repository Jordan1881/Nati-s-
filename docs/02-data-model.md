# 02 — Data Model

This document specifies the SQLite schema for NATI's. It is the source of
truth for all database structure. Schema changes require updating this doc
first, then writing a Drizzle migration.

---

## 1. Storage

- **Engine:** PostgreSQL via Supabase.
- **Client:** Drizzle ORM with the `drizzle-orm/node-postgres` adapter (`pg` package).
- **Connection:** Supabase connection string from env var `DATABASE_URL`.
- **Migrations:** Drizzle ORM, migrations stored in `packages/backend/drizzle/`.
- **Backups:** Supabase provides automated daily backups on paid plans. A Vercel
  Cron job runs every Friday 23:00 to trigger a JSON export and store it in
  Supabase Storage as a secondary backup. See `docs/06-policies-edge-cases.md` §6.

Never commit `.env` or any file containing database credentials.

---

## 2. Schema

### `menu_items`

```sql
CREATE TABLE menu_items (
  id            SERIAL  PRIMARY KEY,
  name          TEXT    NOT NULL,
  category      TEXT    NOT NULL,             -- "תבשילים" | "חומוס" | "סלטים"
  unit_label    TEXT,                         -- "½ ק״ג", "1 ק״ג", "ליח׳", or NULL
  price         NUMERIC(10,2) NOT NULL,       -- in ₪
  active        BOOLEAN NOT NULL DEFAULT TRUE, -- soft-delete flag
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `orders`

```sql
CREATE TABLE orders (
  id                  SERIAL  PRIMARY KEY,
  daily_number        INTEGER NOT NULL,         -- resets per order_date
  order_date          DATE    NOT NULL,          -- the Friday it's for
  customer_name       TEXT    NOT NULL,
  customer_phone      TEXT    NOT NULL,
  pickup_time         TEXT,                      -- "HH:MM" or NULL
  status              TEXT,                      -- free text, optional
  payment_method      TEXT,                      -- "cash" | "credit" | NULL
  payment_status      TEXT,                      -- "paid" | "unpaid" | NULL
  notes               TEXT,                      -- order-level notes
  total_price         NUMERIC(10,2) NOT NULL,    -- denormalized snapshot
  kitchen_printed_at  TIMESTAMPTZ,               -- first print timestamp, or NULL
  customer_printed_at TIMESTAMPTZ,               -- first print timestamp, or NULL
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_date, daily_number)
);
```

### `order_lines`

```sql
CREATE TABLE order_lines (
  id              SERIAL  PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    INTEGER NOT NULL REFERENCES menu_items(id),
  quantity        INTEGER NOT NULL,
  -- Snapshot fields: frozen at order time, never updated.
  item_name_snap  TEXT    NOT NULL,
  unit_label_snap TEXT,
  price_snap      NUMERIC(10,2) NOT NULL,
  category_snap   TEXT    NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_orders_date         ON orders(order_date);
CREATE INDEX idx_orders_phone        ON orders(customer_phone);
CREATE INDEX idx_order_lines_order   ON order_lines(order_id);
CREATE INDEX idx_order_lines_item    ON order_lines(menu_item_id);
CREATE INDEX idx_menu_items_category ON menu_items(category, display_order);
```

---

## 3. Critical design decisions

These were made deliberately during product grilling. Reasoning must survive
into the build — do not relitigate.

### 3.1 Each menu-item size is its own row

A menu item with two sizes (e.g., ברסקט עגל at ½ ק״ג / 1 ק״ג) is stored as
two separate rows, each with its own `unit_label` and `price`. Variant-less
items have `unit_label = NULL`.

**Rationale:** simpler aggregation (per-size totals via plain group-by),
faster order entry (tap once, no size modal), naturally formatted bon
lines (`2× ברסקט עגל 1 ק״ג`).

**Rejected:** separate `menu_item_variants` table (over-engineered),
JSON-embedded variants (bad SQL ergonomics).

### 3.2 Snapshot pattern on `order_lines`

Every line stores its own copy of `item_name`, `unit_label`, `price`,
`category` — frozen at order time, never updated.

**Rationale:** historical orders must display the price/name they were
sold at, even after the menu changes. The `menu_item_id` FK is preserved
for analytics; display always uses the snapshot.

This is the most important schema decision in the file.

### 3.3 `order_date` is the sale Friday, not the entry day

Orders entered Thursday belong to Friday's books. All date-keyed operations
(daily numbering, summary, bonim file) use `order_date`, never the date
component of `created_at`.

The frontend defaults `order_date` to "next upcoming Friday" but the
operator can override it.

### 3.4 `daily_number` for display, `id` for identity

`daily_number` resets per `order_date`. The operator and chef see `#12` on
bons. The system uses global `id` for FKs and URLs. `UNIQUE (order_date,
daily_number)` enforces consistency.

When inserting an order, compute the next `daily_number` inside the same
transaction as the INSERT:

```sql
SELECT COALESCE(MAX(daily_number), 0) + 1
FROM orders
WHERE order_date = $1
```

Use Drizzle's async transaction API (`db.transaction(async (tx) => { ... })`).
The `UNIQUE (order_date, daily_number)` constraint acts as a safety net against
race conditions in the unlikely event of concurrent inserts.

### 3.5 No `customers` table

Customer is a derived entity via `GROUP BY customer_phone` on `orders`.
Customer info (name, phone) lives directly on `orders` rows.

**Rationale:** single-user, low volume — no need for a separate entity.
Phone-based lookup answers all current use cases. If richer customer data
is ever needed, introducing a `customers` table is a one-migration change.

### 3.6 `payment_method` and `payment_status` are separate columns

Not one combined `payment` column.

**Rationale:** they represent two distinct facts (*how* it'll be paid vs.
*whether* it's been paid). Splitting them enables the "unpaid orders"
filter. Default state is both `NULL` — order entered, payment unknown. On
pickup, the operator sets `payment_status = "paid"` and the matching
`payment_method` together.

### 3.7 Soft delete on `menu_items`, hard delete on `orders`

- Menu items: `active = 0`. Row preserved so historical FK references stay
  valid. UI label: "השבת" (deactivate).
- Orders: hard delete via `DELETE /api/orders/:id`. `ON DELETE CASCADE`
  removes child lines. Rare action, requires UI confirm with customer name
  and total.

### 3.8 `total_price` is denormalized on `orders`

Computed as `SUM(quantity × price_snap)` over the order's lines, but
stored on the order row.

**Rationale:** every list view shows totals. Recomputing on every list
query is wasteful. The service layer recomputes and writes `total_price`
atomically inside any order-mutation transaction (POST `/api/orders`, PUT
`/api/orders/:id/lines`). Single source of write means no staleness in
practice.

### 3.9 `pickup_time` is `TEXT`, not a timestamp

Stored as `"HH:MM"` string. No timezone, no date component, no validation.
The operator may also leave it `NULL` or write atypical strings — accept
that.

### 3.10 `status` is free-text, not an enum

The operator may type anything ("מוכן", "בהכנה", "טלפן ולא ענה") or leave
it blank. The UI may suggest common values via autocomplete but the column
is unconstrained.

### 3.11 Print timestamps are honest

`kitchen_printed_at` and `customer_printed_at` record when the print HTML
was *rendered*, not when paper actually came out. Browser print dialogs
don't expose success callbacks. The fields are set on first render only
(idempotent — re-prints don't update them) and used to display a "not yet
printed" badge in the order list.

---

## 4. Conventions

- **Timestamps** stored as `TIMESTAMPTZ` (PostgreSQL). Drizzle returns them as
  JavaScript `Date` objects; serialize to ISO 8601 strings in API responses via
  `date.toISOString()`.
- **Booleans** stored as `BOOLEAN` — PostgreSQL native type.
- **Currency** stored as `NUMERIC(10,2)`. Format on display with
  `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })`.
- **Dates** (`order_date`) stored as `DATE`. Drizzle returns them as strings
  in `YYYY-MM-DD` format from PostgreSQL — no conversion needed for display.
- **All writes go through Drizzle.** No raw SQL outside migration files.
- **All API inputs validated with Zod.** Share schemas between frontend
  and backend where possible.

---

## 5. Migration discipline

- One Drizzle migration per schema change. Never edit a committed migration.
- Migration files are timestamped and committed to git.
- Before any migration against the production Supabase database, verify that
  Supabase's automated backup has run recently (check the Supabase dashboard),
  OR take a manual snapshot first via the Supabase dashboard.
  Document this in the deployment runbook.