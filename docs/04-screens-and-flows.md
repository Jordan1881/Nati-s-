# 04 — Screens and Flows

This document specifies the frontend surface of NATI's. It defines every
screen, every route, the navigation model, and the detailed flow for the
order entry screen (the most-used surface in the app).

---

## 1. Layout principles

- **Hebrew-only, RTL-first.** `<html dir="rtl" lang="he">`. All Tailwind
  spacing uses logical properties: `ms-*`, `me-*`, `ps-*`, `pe-*`. Never
  `ml-*` / `mr-*` / `pl-*` / `pr-*`.
- **Mobile-first responsive.** The operator uses both his laptop
  (Thursday, primary) and his phone (anywhere). Same code, responsive
  breakpoints. No separate mobile build.
- **One operator at a time.** No real-time updates. Order lists refresh
  on window/tab focus event.
- **Currency:** `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })`.
- **Dates:** `Intl.DateTimeFormat('he-IL')` with locale-appropriate format.
- **Phone numbers and times** render `dir="ltr"` inside RTL containers
  (numbers are LTR even in Hebrew).
- **No emojis in production UI strings.** Icons via `lucide-react`.

---

## 2. Screen inventory (8 screens, 3 tiers)

### Tier 1 — used every Friday cycle, must be excellent

| # | Screen | Route |
|---|---|---|
| 1 | Order entry (new order) | `/orders/new` |
| 2 | Today's orders list | `/orders/today` (also app root `/`) |
| 3 | Order detail / edit | `/orders/:id` |
| 4 | Daily summary | `/summary/today` |

### Tier 2 — used occasionally, functional

| # | Screen | Route |
|---|---|---|
| 5 | Customer search | `/customers` |
| 6 | Single customer history | `/customers/:phone` |
| 7 | Menu admin | `/menu` |
| 8 | Past days picker | `/orders/by-date` |

### Tier 3 — deferred

| # | Screen | Route |
|---|---|---|
| — | Settings | `/settings` (deferred — config in JSON file in v1) |

---

## 3. Navigation

**Top nav (always visible on desktop, drawer on mobile):**

`הזמנות · הזמנה חדשה · סיכום יומי · לקוחות · תפריט`

Maps to:
- הזמנות → `/orders/today`
- הזמנה חדשה → `/orders/new`
- סיכום יומי → `/summary/today`
- לקוחות → `/customers`
- תפריט → `/menu`

**Floating action button (FAB)** on every page except `/orders/new`:

> **+ הזמנה חדשה**

Anchored to the bottom-start corner (which is bottom-right in RTL).
Primary action used most. Visible always, never blocks content.

**Active sale date model:** all "today" routes (`/orders/today`,
`/summary/today`) resolve to the **next upcoming Friday**. Sat–Thu → next
Friday. Friday itself → today. There is no "literal today" anywhere in
the app. A date picker in the top-end of list/summary screens lets the
operator switch to any other date.

---

## 4. Tier 1 screens (detailed)

### 4.1 Order entry (`/orders/new`)

The most-used surface in the entire app. Used 95%+ of the time.

**Layout — desktop:**

```
┌────────────────────────────────────────────────────────────────────┐
│  ← הזמנות     הזמנה חדשה                          [שמור והדפס]    │
├──────────────────────────────────────┬─────────────────────────────┤
│                                      │                             │
│  📞 טלפון: 050-1234567       [⌫]    │   הזמנה (3 פריטים)          │
│                                      │                             │
│  ┌ לקוח חוזר: לילי כהן · 7 הזמנות ┐│   2× ברסקט עגל 1 ק״ג        │
│  │              [השתמש בפרטים]    ││                       220 ₪│
│  └────────────────────────────────┘│   1× רוטיסרי                │
│                                      │                       96 ₪│
│  שם: לילי כהן                        │   3× פיתה                   │
│                                      │                       7.5 ₪│
│  זמן איסוף: [09:30  ▾]               │                             │
│                                      │   ─────────────────         │
│  תאריך הזמנה: [שישי, 15.5.2026 ▾]   │   הערות: [______]           │
│                                      │                             │
│  ─────────────────                   │   תשלום:                    │
│                                      │   ( ) מזומן ( ) אשראי       │
│  [תבשילים] [חומוס] [סלטים]          │   (●) טרם                   │
│  ━━━━━━━━━                          │                             │
│                                      │   ─────────────────         │
│  ┌────────┐ ┌────────┐ ┌────────┐  │                             │
│  │ ברסקט  │ │ ברסקט  │ │רוטיסרי │  │   סה״כ: 323.5 ₪             │
│  │½ ק״ג   │ │1 ק״ג   │ │        │  │                             │
│  │ 55 ₪   │ │ 110 ₪  │ │ 96 ₪   │  │   [שמור והדפס]              │
│  │   [+]  │ │[-] 2[+]│ │   [+]  │  │   [שמור]                    │
│  └────────┘ └────────┘ └────────┘  │                             │
│  ...                                 │                             │
│                                      │                             │
└──────────────────────────────────────┴─────────────────────────────┘
```

**Layout — mobile:**

The cart panel becomes a sticky bottom drawer that expands when tapped.
Collapsed state shows item count + total + "שמור והדפס" button. Tap
expands to full cart view. Menu grid above scrolls independently.

**Field order (deliberate — phone first):**

1. **`customer_phone`** — first field. Triggers customer-history lookup
   debounced 300ms after last keystroke once 7+ digits are typed.
2. **Returning-customer banner** — appears if a match is found:
   *"לקוח חוזר: לילי כהן · 7 הזמנות"* with a `[השתמש בפרטים]` button
   that auto-fills the name. If no match, banner is absent (never shows
   "new customer" — that's noise).
3. **`customer_name`** — text field, auto-filled by the banner button.
4. **`pickup_time`** — defaults to `09:30`, editable. Can be cleared.
   `dir="ltr"` inside the input. Use a `<select>` of common times
   (`09:00`, `09:15`, ... `12:00`) plus a "free entry" option.
5. **`order_date`** — defaults to active sale date (next Friday).
   Editable via a date picker. Hebrew-formatted display.
6. **Category tabs** — `תבשילים` / `חומוס` / `סלטים`, in that order.
   Active tab underlined. Tabs derive dynamically from distinct
   `category` values among active menu items.
7. **Item grid** — cards within the active category. Each card shows:
   - Item name with unit label (`ברסקט עגל 1 ק״ג`)
   - Price (`110 ₪`)
   - `[+]` button when not in cart, or `[-] qty [+]` stepper when in cart.
   - Tap `[+]` adds 1 (or increments). Tap `[-]` decrements; reaching 0
     removes the line.
8. **Sticky cart panel (read-only)** — see below.
9. **Order-level `notes`** — free text input.
10. **Payment radio** — three options: `מזומן` / `אשראי` / `טרם`. Default
    `טרם`. Selecting `מזומן` or `אשראי` sets `payment_status = "paid"`
    and the matching method. Selecting `טרם` leaves both `NULL`.
11. **Total** — large, bold, formatted as ₪.
12. **Action buttons** —
    - **`שמור והדפס`** (primary, filled) — saves, then opens
      `/print/order/:id` in a new tab and triggers `window.print()`.
      One dialog, two A4 pages.
    - **`שמור`** (secondary, outlined) — saves, returns to
      `/orders/today`. No print.

**Cart panel (sticky):**

Read-only summary of what's in the order. **Not editable in place.** All
quantity changes happen on the menu card stepper. This is deliberate —
having two editing surfaces (cart and menu card) confuses users.

The cart shows:
- Per-line: `<qty> × <name with unit> ........ <line total> ₪`
- Notes input (the only editable element in the cart panel)
- Payment radio
- Grand total
- Save buttons

**Constraints:**

- **Inactive menu items are hidden** from the grid.
- **No per-line item notes** in v1 — order-level notes only.
- **No per-line edit in cart** — quantity changes via menu card stepper only.
- **Form submission is disabled** if `customer_name` or `customer_phone`
  is empty, or if the cart has zero lines.

**On save success:**

- `שמור והדפס`: order POSTed → on `201`, open `/print/order/:id` in new
  tab → trigger `window.print()` in that tab → on close, redirect to
  `/orders/today`.
- `שמור`: order POSTed → on `201`, redirect to `/orders/today` with a
  success toast: *"הזמנה #12 נשמרה"*.

---

### 4.2 Today's orders list (`/orders/today`)

Default home of the app.

**Top bar:**
- Title: `הזמנות ליום שישי, 15.5.2026` (formatted in Hebrew).
- Date picker on the end-side, defaults to active sale date.
- Filter pills: `הכל` / `לא שולמו` / `לא הודפסו`.

**Order rows (sorted by `pickup_time ASC`, NULL pickup_time at the end):**

```
┌──────────────────────────────────────────────────────────────┐
│  #12   09:30   לילי כהן       050-1234567        323.5 ₪    │
│        4 פריטים   ✓ שולם (מזומן)   🖨️ הודפס         [<]   │
├──────────────────────────────────────────────────────────────┤
│  #13   09:45   דוד לוי         052-9876543         180.0 ₪  │
│        3 פריטים   ⚠️ טרם שולם    ⚠️ לא הודפס        [<]   │
└──────────────────────────────────────────────────────────────┘
```

**Per-row badges:**
- Payment: `✓ שולם (מזומן)` / `✓ שולם (אשראי)` / `⚠️ טרם שולם`.
- Print: `🖨️ הודפס` if both `kitchen_printed_at` AND `customer_printed_at`
  are non-NULL. Otherwise `⚠️ לא הודפס`.

**Row click** → `/orders/:id`.

**Empty state:** *"אין הזמנות ליום זה"* with a `[+ הזמנה חדשה]` button.

**Bottom-of-page actions:** none — the FAB handles new-order creation.

**Refresh behavior:** refetch on window/tab focus event (`visibilitychange`).

---

### 4.3 Order detail / edit (`/orders/:id`)

Two modes on the same screen: **view** and **edit**. Toggled by an
`[ערוך]` button in the top bar. Save and Cancel buttons appear in edit mode.

**Sections (top to bottom):**

1. **Header** — `הזמנה #12 · יום שישי 15.5.2026 · 09:30`. Edit affordance.
2. **Edit-after-print banner** (conditional) — see section 5 below.
3. **Customer block** — name, phone. Editable in edit mode.
4. **Pickup time / status / payment block** — three controls, side by side.
   `pickup_time`, `status` (free text with autocomplete suggestions:
   *מוכן*, *בהכנה*, *הסתיים*, *טלפן ולא ענה*), `payment_method` +
   `payment_status` (combined as the same 3-radio group as the entry form).
5. **Items block** — line list. In view mode, read-only. In edit mode, the
   menu grid + cart panel from `/orders/new` reappears here. Saving
   triggers `PUT /api/orders/:id/lines` (replace-all) atomically with the
   `PATCH /api/orders/:id` for header changes.
6. **Notes block** — order-level notes, editable.
7. **Totals block** — total, payment status, print timestamps (small text:
   *"בון מטבח הודפס לראשונה ב-07:12"*).
8. **Action buttons (always visible in view mode):**
   - `[הדפס שוב — בון מטבח]`
   - `[הדפס שוב — שובר לקוח]`
   - `[הדפס שניהם]` — opens `/print/order/:id` (combined).
   - `[מחק הזמנה]` — danger button, in red, at the bottom. Two-step
     confirm with a modal showing customer name and total.

---

### 4.4 Daily summary (`/summary/today`)

**Top bar:**
- Title: `סיכום יומי · יום שישי 15.5.2026`.
- Date picker.

**Sections (top to bottom):**

1. **Headline numbers row** — three big numbers:
   - `23 הזמנות`
   - `1,840.50 ₪ סה״כ`
   - `1 הזמנה לא שולמה — 75 ₪` (omitted if zero unpaid)
2. **Payment breakdown** — small table:
```
   מזומן     15 הזמנות    1,200.00 ₪
   אשראי      7 הזמנות      640.50 ₪
   טרם שולם   1 הזמנה        75.00 ₪  →  [#12]
```
   The `→ [#12]` link navigates to `/orders/12`.
3. **Items sold (rolled up)** — table from `items_rolled_up`:
```
   קטגוריה   פריט              סה״כ כמות    הכנסה
   תבשילים   ברסקט עגל              10        715.00 ₪
   תבשילים   רוטיסרי                 6        576.00 ₪
   חומוס     צלחת חומוס             18        450.00 ₪
   ...
```
   Sorted by `revenue DESC` within each category. A `[הצג פירוט גדלים]`
   toggle expands to the per-row `items_sold` view (with unit_label split).
4. **Action buttons:**
   - **`[הדפס קובץ בונים של היום]`** — opens `/print/bonim/:date` in new
     tab, triggers `window.print()`.
   - `[יצוא JSON]` — downloads a JSON of all orders for the date (manual
     backup path).

**Empty state:** *"אין הזמנות ליום זה"*.

---

## 5. Edit-after-print banner

Shown on `/orders/:id` (Tier 1 screen 3) when:
- `kitchen_printed_at IS NOT NULL`, AND
- The order's lines or notes have been modified after the print
  timestamp.

Detection: compare `orders.updated_at` to `orders.kitchen_printed_at`. If
`updated_at > kitchen_printed_at`, show the banner.

**Banner content:**

> ⚠️ **ההזמנה עודכנה אחרי הדפסה — יש להדפיס מחדש את הבון לבישול**
> [הדפס שוב את בון המטבח]

The button calls `/print/order/:id/kitchen` in a new tab and triggers
print.

**Important:** the app does NOT auto-reprint, does NOT refuse the edit,
and does NOT block any other action. The banner is a nag, not a gate.
The operator is responsible for actually re-printing.

This same logic applies to the customer slip (`customer_printed_at`),
but the customer slip is less time-sensitive (the customer hasn't picked
up yet) so its banner is lower-priority. Render both banners stacked if
both apply.

---

## 6. Tier 2 screens (specifications)

### 6.1 Customer search (`/customers`)

- Search input at top: typeahead by name or phone (case-insensitive
  substring on both `customer_name` and `customer_phone`).
- Sort toggle: `לפי כמות הזמנות` (default) / `לפי סה״כ הוצאה`.
- Result rows:
```
  לילי כהן       050-1234567    7 הזמנות    1,240.50 ₪    אחרון: 26.4.2026
```
- Click → `/customers/:phone`.

### 6.2 Single customer history (`/customers/:phone`)

- Header: name + phone + summary stats (`7 הזמנות · 1,240.50 ₪ סה״כ ·
  ראשון: 15.1.2026 · אחרון: 26.4.2026`).
- "פריטים מועדפים" — top 5 items by quantity.
- "הזמנות אחרונות" — last 5 orders, each clickable → `/orders/:id`.
- No edit affordance — this is a read-only derived view.

### 6.3 Menu admin (`/menu`)

- Three sections, one per category. Each section shows its items in
  `display_order`.
- Per row: name, unit_label, price, active toggle, edit button, drag handle
  for reordering.
- Top of each section: `[+ פריט חדש בקטגוריה זו]` button.
- New-item form is a modal: name, unit_label (optional), price, category
  preset.
- Soft-delete uses the active toggle. There is no hard-delete affordance
  in the UI.
- Drag-reorder updates `display_order` via `PATCH /api/menu-items/:id`.

### 6.4 Past days picker (`/orders/by-date`)

- Calendar widget defaulting to the current month.
- Days with at least one order are highlighted.
- Click a date → navigates to `/orders/today?date=YYYY-MM-DD` (i.e.,
  same orders list screen, just for a past date).

---

## 7. Settings (Tier 3, deferred)

Not built in v1. Configuration lives in:
- `.env` for server config (port, password, DB path).
- A `config.json` checked into the backend package for restaurant
  metadata (name, phone, default pickup time options, category list).

If a settings UI is added later, it lives at `/settings`. Not in v1
scope.

---

## 8. Out-of-scope screens

The following screens are explicitly **not built in v1**:

- Login screen with anything beyond a single password field.
- Onboarding / setup wizard.
- User profile, account management.
- Notifications panel.
- Help / documentation embedded in the app (the README covers it).
- Any analytics / charting screens beyond the daily summary.

See `docs/07-out-of-scope.md` for the full list.