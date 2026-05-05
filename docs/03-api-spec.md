# 03 — API Spec

This document specifies the HTTP API for NATI's. The backend is Node.js +
Express + TypeScript. All inputs are validated with Zod. All database
access goes through Drizzle.

15 endpoints total, grouped into Menu, Orders, Daily Summary, Customers,
and Print routes.

---

## 1. Conventions

- **Base path:** `/api` for JSON endpoints, `/print` for HTML print views.
- **Content type:** `application/json` for all JSON endpoints. Print routes
  return `text/html`.
- **Timestamps in responses:** ISO 8601 strings (`"2026-05-15T19:42:13.000Z"`).
- **Currency in responses:** `REAL` (number), in ₪. Frontend formats for display.
- **Auth:** all endpoints require a valid signed session cookie. The login
  endpoint is the single exception (see section 7).
- **Errors:** standard HTTP status codes. Error body shape:
```json
  { "error": "string code", "message": "human-readable message", "details": { } }
```
- **Validation:** Zod schemas live alongside route handlers. Invalid input
  returns `400` with field-level details in `error.details`.
- **Atomic writes:** all multi-row writes (creating orders, replacing lines)
  happen inside a single Drizzle async transaction (`db.transaction(async (tx) => { ... })`).

---

## 2. Menu endpoints

### `GET /api/menu-items`

List menu items.

**Query params:**
- `active` (optional, `"true" | "false"`) — filter by active flag. Omitted = all.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "ברסקט עגל",
    "category": "תבשילים",
    "unit_label": "½ ק״ג",
    "price": 55.0,
    "active": true,
    "display_order": 0,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

Sorted by `(category, display_order, id)`.

---

### `GET /api/menu-items/:id`

Single menu item.

**Response:** `200 OK` with the same shape as a list element.
**Errors:** `404` if not found.

---

### `POST /api/menu-items`

Create a new menu item.

**Body:**
```json
{
  "name": "string, required",
  "category": "string, required",
  "unit_label": "string | null",
  "price": "number, required, >= 0",
  "display_order": "number, optional, default 0"
}
```

**Response:** `201 Created` with the created row.
**Errors:** `400` on invalid input.

---

### `PATCH /api/menu-items/:id`

Update a menu item. Any subset of fields permitted.

**Body:** any subset of:
```json
{
  "name": "string",
  "category": "string",
  "unit_label": "string | null",
  "price": "number >= 0",
  "active": "boolean",
  "display_order": "number"
}
```

**Response:** `200 OK` with the updated row.
**Errors:** `400` on invalid input, `404` if not found.

**Note:** changing `name`, `price`, or `unit_label` does NOT affect
historical orders thanks to the snapshot pattern on `order_lines`.

---

### `DELETE /api/menu-items/:id`

**Soft delete** — sets `active = 0`. The row is preserved so historical
`order_lines.menu_item_id` references stay valid.

**Response:** `204 No Content`.
**Errors:** `404` if not found.

---

## 3. Order endpoints

### `GET /api/orders`

List orders.

**Query params (all optional):**
- `date=YYYY-MM-DD` — orders for a specific `order_date`.
- `from=YYYY-MM-DD&to=YYYY-MM-DD` — date range, inclusive.
- `phone=string` — orders for a specific customer phone.

If no params provided, returns the active sale date's orders.

**Response:** `200 OK`
```json
[
  {
    "id": 87,
    "daily_number": 12,
    "order_date": "2026-05-15",
    "customer_name": "לילי כהן",
    "customer_phone": "050-1234567",
    "pickup_time": "09:30",
    "status": "מוכן",
    "payment_method": "cash",
    "payment_status": "paid",
    "notes": null,
    "total_price": 322.5,
    "kitchen_printed_at": "2026-05-15T07:12:00.000Z",
    "customer_printed_at": "2026-05-15T07:12:00.000Z",
    "created_at": "...",
    "updated_at": "...",
    "line_count": 4
  }
]
```

Sorted by `(order_date DESC, daily_number ASC)`. Lines are NOT included in
list view — `line_count` only. Use `GET /api/orders/:id` for full lines.

---

### `GET /api/orders/:id`

Single order, including all lines.

**Response:** `200 OK`
```json
{
  "id": 87,
  "daily_number": 12,
  "order_date": "2026-05-15",
  "customer_name": "לילי כהן",
  "customer_phone": "050-1234567",
  "pickup_time": "09:30",
  "status": "מוכן",
  "payment_method": "cash",
  "payment_status": "paid",
  "notes": null,
  "total_price": 322.5,
  "kitchen_printed_at": "...",
  "customer_printed_at": "...",
  "created_at": "...",
  "updated_at": "...",
  "lines": [
    {
      "id": 201,
      "menu_item_id": 2,
      "quantity": 2,
      "item_name_snap": "ברסקט עגל",
      "unit_label_snap": "1 ק״ג",
      "price_snap": 110.0,
      "category_snap": "תבשילים"
    }
  ]
}
```

**Errors:** `404` if not found.

---

### `POST /api/orders`

Create an order with its lines, atomically.

**Body:**
```json
{
  "order_date": "YYYY-MM-DD, required",
  "customer_name": "string, required",
  "customer_phone": "string, required",
  "pickup_time": "HH:MM | null",
  "status": "string | null",
  "payment_method": "\"cash\" | \"credit\" | null",
  "payment_status": "\"paid\" | \"unpaid\" | null",
  "notes": "string | null",
  "lines": [
    { "menu_item_id": "number, required", "quantity": "number, required, >= 1" }
  ]
}
```

**Server responsibilities (inside one transaction):**
1. Look up each `menu_item_id` and verify `active = 1`.
2. Snapshot `name`, `unit_label`, `price`, `category` into each line.
3. Compute `total_price = SUM(quantity × price_snap)`.
4. Compute `daily_number = COALESCE(MAX(daily_number), 0) + 1` for the
   given `order_date`.
5. Insert `orders` row, then `order_lines` rows.
6. Return the full created order (same shape as `GET /api/orders/:id`).

**Response:** `201 Created`.
**Errors:** `400` on invalid input or referenced inactive/missing menu items.

---

### `PATCH /api/orders/:id`

Update order header fields. Lines are NOT updated through this endpoint
(use `PUT /api/orders/:id/lines`).

**Body:** any subset of:
```json
{
  "customer_name": "string",
  "customer_phone": "string",
  "pickup_time": "string | null",
  "status": "string | null",
  "payment_method": "\"cash\" | \"credit\" | null",
  "payment_status": "\"paid\" | \"unpaid\" | null",
  "notes": "string | null"
}
```

`order_date` and `daily_number` are immutable post-creation.

**Response:** `200 OK` with the updated order (full shape).
**Errors:** `400` on invalid input, `404` if not found.

---

### `PUT /api/orders/:id/lines`

Replace **all** lines on an order, atomically. Server recomputes
`total_price` in the same transaction.

**Body:**
```json
{
  "lines": [
    { "menu_item_id": "number, required", "quantity": "number, required, >= 1" }
  ]
}
```

**Server responsibilities (inside one transaction):**
1. Delete all existing lines for this `order_id`.
2. Snapshot fresh values from `menu_items` for each new line.
3. Insert new lines.
4. Recompute and update `orders.total_price`.
5. Update `orders.updated_at`.

**Response:** `200 OK` with the updated order (full shape).
**Errors:** `400` on invalid input or referenced inactive/missing menu items,
`404` if order not found.

**Note:** if the order had been printed (either timestamp non-NULL), the
edit-after-print banner is the frontend's responsibility — see
`docs/06-policies-edge-cases.md`.

---

### `DELETE /api/orders/:id`

Hard delete. `ON DELETE CASCADE` removes child lines.

**Response:** `204 No Content`.
**Errors:** `404` if not found.

UI must confirm before calling this endpoint.

---

## 4. Daily summary

### `GET /api/summary/:date`

Aggregate summary for a given `order_date` (`YYYY-MM-DD`).

**Response:** `200 OK`
```json
{
  "date": "2026-05-15",
  "order_count": 23,
  "total_revenue": 1840.50,
  "payment_breakdown": {
    "cash":   { "count": 15, "total": 1200.00 },
    "credit": { "count":  7, "total":  640.50 },
    "unpaid": { "count":  1, "total":   75.00, "order_ids": [12] }
  },
  "items_sold": [
    {
      "menu_item_id": 1,
      "name": "ברסקט עגל",
      "unit_label": "½ ק״ג",
      "category": "תבשילים",
      "quantity": 7,
      "revenue": 385.00
    }
  ],
  "items_rolled_up": [
    {
      "name": "ברסקט עגל",
      "category": "תבשילים",
      "total_quantity": 10,
      "revenue": 715.00
    }
  ]
}
```

**Field definitions:**
- `payment_breakdown.cash`: orders where `payment_method = "cash"` AND
  `payment_status = "paid"`.
- `payment_breakdown.credit`: orders where `payment_method = "credit"` AND
  `payment_status = "paid"`.
- `payment_breakdown.unpaid`: orders where `payment_status` is NOT `"paid"`
  (NULL or `"unpaid"`). Includes their IDs for one-click navigation.
- `total_revenue`: sum of `total_price` across **all** orders for the date,
  paid or not.
- `items_sold`: per-row aggregation. One entry per `menu_item_id`. Display
  uses snapshot fields from `order_lines`.
- `items_rolled_up`: parent-name aggregation. `GROUP BY item_name_snap,
  category_snap` ignoring `unit_label_snap`. Used to answer "how much
  ברסקט moved today" without size split.

If no orders exist for the date, returns the same shape with zero counts
and empty arrays.

**Errors:** `400` if date format is invalid.

---

## 5. Customer endpoints

There is no `customers` table. Both endpoints query `orders` directly.

### `GET /api/customers?phone=:phone`

Single customer history, derived by `GROUP BY customer_phone`.

**Response:** `200 OK`
```json
{
  "phone": "050-1234567",
  "name": "לילי כהן",
  "order_count": 7,
  "first_seen": "2026-01-15",
  "last_seen": "2026-04-26",
  "total_spent": 1240.50,
  "favorite_items": [
    { "name": "ברסקט עגל", "unit_label": "½ ק״ג", "count": 7 }
  ],
  "recent_orders": [
    {
      "id": 87,
      "order_date": "2026-04-26",
      "daily_number": 5,
      "total_price": 175.00,
      "line_count": 4
    }
  ]
}
```

**Field definitions:**
- `name`: most recent name used (from the latest order by `order_date,
  created_at`).
- `first_seen` / `last_seen`: min/max `order_date`.
- `total_spent`: sum of `total_price` across all of this phone's orders.
- `favorite_items`: top 5 items by total quantity across all of this
  phone's orders. Group by `item_name_snap, unit_label_snap`.
- `recent_orders`: last 5 orders, summary only, sorted by `order_date DESC,
  daily_number DESC`.

**Errors:** `404` if no orders match this phone.

---

### `GET /api/customers`

List/search customers.

**Query params (all optional):**
- `search=string` — typeahead match against `customer_name` (case-insensitive
  substring) and `customer_phone` (substring).
- `sort=orders|spent` — default `orders`.
- `limit=number` — default 50, max 200.

**Response:** `200 OK`
```json
[
  {
    "phone": "050-1234567",
    "name": "לילי כהן",
    "order_count": 7,
    "total_spent": 1240.50,
    "last_seen": "2026-04-26"
  }
]
```

Sorted by `order_count DESC` (or `total_spent DESC` if `sort=spent`).

---

## 6. Print routes

These return HTML, not JSON. They are server-rendered via `react-dom/server`
using the same React components the SPA defines. All print HTML uses
`dir="rtl"` and includes A4 `@page` CSS.

### `GET /print/order/:id`

**Combined kitchen bon + customer slip**, two A4 pages with a
`page-break-after: always` between them. This is the default print route
for the "שמור והדפס" button — one print dialog, two sheets out.

**Side effects:** on first call where either `kitchen_printed_at` or
`customer_printed_at` is `NULL`, sets it to `new Date().toISOString()`.
Idempotent — re-renders don't update existing timestamps.

**Errors:** `404` if order not found.

---

### `GET /print/order/:id/kitchen`

Kitchen bon only. Used for re-print scenarios (edit-after-print, lost bon).

**Side effects:** sets `kitchen_printed_at` if currently `NULL`.

---

### `GET /print/order/:id/customer`

Customer slip only.

**Side effects:** sets `customer_printed_at` if currently `NULL`.

---

### `GET /print/bonim/:date`

All kitchen bons for the given `order_date`, concatenated, each on its own
A4 page. Ordered by `daily_number ASC`. Used for the end-of-day archive
("Print today's bonim file").

**Side effects:** none. Does NOT update `kitchen_printed_at` (those orders
have already had their kitchen bons printed individually).

**Errors:** `400` if date format is invalid; returns `200` with an empty
HTML doc if no orders for that date.

---

## 7. Auth (out-of-band note)

A login endpoint exists outside this 15-endpoint count:

- `POST /auth/login` — body `{ "password": "string" }`. On match, sets a
  signed session cookie. Returns `204`. On mismatch, returns `401`.
- `POST /auth/logout` — clears the cookie. Returns `204`.

All other endpoints reject with `401` if the cookie is missing or invalid.

The shared password is set via the `APP_PASSWORD` env var. There is no
user model, no password reset, no rate limiting beyond what the framework
provides.

---

## 8. What this API explicitly does NOT include

- Bulk operations.
- Pagination on `GET /api/orders` (low volume; use date filters instead).
- Per-line CRUD on order lines (use `PUT /api/orders/:id/lines`
  replace-all).
- Real-time push (no WebSockets, no SSE). The order list refreshes on
  window/tab focus.
- Webhooks, integrations, or third-party callbacks.
- Health checks, metrics, or observability endpoints.

If something not listed here is needed, treat it as scope creep and
escalate before implementing.