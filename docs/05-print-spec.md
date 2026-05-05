# 05 — Print Spec

This document specifies the two printable documents produced per order
(kitchen bon, customer slip), the bonim file produced at end-of-day, and
the technical pipeline that renders them.

The print pipeline is **mission-critical**. The kitchen has no screen;
paper is the only interface between the operator and the chef. If
printing breaks Friday morning, the entire system fails.

---

## 1. Pipeline overview

- **Format:** A4 paper, regular home/office printer (inkjet or laser).
- **Rendering:** server-side via `react-dom/server`. The same React
  components used for any in-app preview are reused for print HTML —
  shared component code, shared types.
- **Delivery:** the frontend opens the print URL in a new tab and calls
  `window.print()` in that tab. The browser's native print dialog handles
  the rest.
- **Combined route:** `GET /print/order/:id` returns one HTML document
  containing both the kitchen bon and the customer slip, separated by a
  CSS page break. One print dialog, two A4 sheets out of the printer.
- **Direction:** every print HTML doc has `<html dir="rtl" lang="he">`.
  Print CSS is its own world — RTL must be set explicitly on the print
  HTML, not inherited.
- **Locale:**
  - Currency: `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })`.
  - Dates/times: formatted in Hebrew locale.
  - Phone numbers and time fields render `dir="ltr"` inside RTL containers.

---

## 2. CSS conventions for print

A shared print stylesheet (`print.css`) is included in every print HTML
document. Key rules:

```css
@page {
  size: A4 portrait;
  margin: 15mm;
}

@media print {
  html, body {
    direction: rtl;
    font-family: "Heebo", "Arial Hebrew", Arial, sans-serif;
    color: #000;
    background: #fff;
  }

  .page {
    page-break-after: always;
    width: 100%;
    min-height: 100%;
  }

  .page:last-child {
    page-break-after: auto;
  }

  /* numbers and time fields stay LTR even inside RTL pages */
  .ltr {
    direction: ltr;
    unicode-bidi: isolate;
  }
}
```

- **Font choice:** prefer `Heebo` (Google Fonts) loaded via `<link>` in
  the print HTML head; fall back to `Arial Hebrew` and generic sans-serif.
- **Numbers/time/phone:** wrap in `<span class="ltr">` (or `<bdi>`) to
  prevent bidi reordering of mixed Hebrew + numeric content.
- **No background colors, no images, no logos in v1.** Black ink on
  white. Cheap, fast, photocopy-friendly.

---

## 3. Kitchen bon

Goes to the chef. Contains what to cook. Does NOT contain customer name,
phone, email, or prices — chef doesn't need them, and dropped paper
doesn't leak PII.

### 3.1 Visual layout

```
┌────────────────────────────────────────────┐
│                                            │
│   הזמנה #12              ⏰ 09:30          │
│   ──────────────────────────────────       │
│                                            │
│                                            │
│   תבשילים                                  │
│                                            │
│   2 ×  ברסקט עגל  1 ק״ג                    │
│   1 ×  רוטיסרי                             │
│                                            │
│                                            │
│   חומוס                                    │
│                                            │
│   3 ×  פיתה                                │
│                                            │
│                                            │
│   סלטים                                    │
│                                            │
│   1 ×  סלט סלק  ½ ק״ג                      │
│                                            │
│   ──────────────────────────────────       │
│                                            │
│   הערות:  בלי חריף                         │
│                                            │
│                                            │
│                                            │
│                          נקלט ב-19:42      │
│                                            │
└────────────────────────────────────────────┘
```

### 3.2 Field list

| Field | Source | Display rules |
|---|---|---|
| Order number | `orders.daily_number` | Top-start, format `הזמנה #12`, **largest font on the page** (≥ 36pt). Chef must read it from across the kitchen. |
| Pickup time | `orders.pickup_time` | Top-end, format `⏰ 09:30`, large (≥ 28pt). Omit if `NULL`. |
| Items, grouped by category | `order_lines` joined to snapshots | Group by `category_snap`. Order: `תבשילים` → `חומוס` → `סלטים` → any other. Within each group, sort by line `id ASC`. Per line: `<qty> × <name>` with `unit_label` appended if present. Font ≥ 18pt. |
| Notes | `orders.notes` | Bottom block, only rendered if non-empty. Prefix `הערות:`. Bold the prefix. |
| Entry timestamp | `orders.created_at` | Bottom-end, small (~9pt), format `נקלט ב-HH:MM`. Date omitted (chef doesn't need it). |

### 3.3 What is NOT on the kitchen bon

- Customer name, phone, email
- Prices, totals
- Payment method or status
- Any restaurant branding (it's internal)
- Status field (`orders.status`) — chef doesn't track this

### 3.4 Empty / null handling

- If `pickup_time IS NULL`: omit the time element entirely.
- If `notes` is empty or whitespace-only: omit the notes block.
- If a category has no items in this order: omit the category header.
- If the order has no lines (shouldn't happen — POST validation prevents
  it — but defensively): render `<empty kitchen bon — no items>` and
  log a server-side warning.

---

## 4. Customer slip

Attached to the food bag at pickup. The customer reads it to confirm
"this bag is mine."

### 4.1 Visual layout

```
┌────────────────────────────────────────────┐
│                                            │
│        NATI's  בישול ביתי & חומוס          │
│   ──────────────────────────────────       │
│                                            │
│   הזמנה #12                                │
│                                            │
│                                            │
│   שם:        לילי כהן                      │
│                                            │
│   טלפון:     050-1234567                   │
│                                            │
│   זמן איסוף:  09:30                        │
│                                            │
│   ──────────────────────────────────       │
│                                            │
│   2 × ברסקט עגל 1 ק״ג ............ 220 ₪  │
│   1 × רוטיסרי .......................96 ₪│
│   3 × פיתה .......................... 7.5 ₪│
│   1 × סלט סלק ½ ק״ג ............... 30 ₪  │
│                                            │
│   ──────────────────────────────────       │
│                                            │
│                       סה״כ:    353.5 ₪    │
│                                            │
│   תשלום: מזומן ✓                           │
│                                            │
│                                            │
│                                            │
│   תודה רבה!                                │
│   054-8158182                              │
│                                            │
└────────────────────────────────────────────┘
```

### 4.2 Field list

| Field | Source | Display rules |
|---|---|---|
| Restaurant header | hardcoded in `config.json` | Top, centered: `NATI's  בישול ביתי & חומוס`. Medium-large (~22pt). Single line. |
| Order number | `orders.daily_number` | Below header, format `הזמנה #12`. Must visually match the kitchen bon's number so the operator can pair them. |
| Customer name | `orders.customer_name` | Format `שם: <name>`. Large (≥ 22pt). Primary "this is your bag" signal. |
| Customer phone | `orders.customer_phone` | Format `טלפון: <phone>`. Large (≥ 18pt). Phone wrapped in `<span class="ltr">`. |
| Pickup time | `orders.pickup_time` | Format `זמן איסוף: <HH:MM>`. Large (≥ 18pt). Omit row if `NULL`. |
| Order lines | `order_lines` | Per line: `<qty> × <name with unit> ........... <qty × price_snap> ₪`. Dotted leader between description and price. Font ~14pt. |
| Total | `orders.total_price` | Format `סה״כ: <total> ₪`. Bold, large (≥ 22pt). End-aligned. |
| Payment confirmation | `orders.payment_method` + `orders.payment_status` | If `payment_status = "paid"` and `payment_method = "cash"`: render `תשלום: מזומן ✓`. If `payment_status = "paid"` and `payment_method = "credit"`: render `תשלום: אשראי ✓`. Otherwise: omit the line entirely (no "unpaid" stamp on the customer slip). |
| Footer | hardcoded in `config.json` | `תודה רבה!` line, then restaurant phone (`054-8158182`). Small (~10pt), centered, bottom of page. |

### 4.3 What is NOT on the customer slip

- Email (we don't even collect it anymore — schema has no `customer_email`).
- Status field (`orders.status`) — this is operator's internal note.
- Entry timestamp — irrelevant to the customer.
- Notes (`orders.notes`) — these are kitchen instructions, not customer-facing.

### 4.4 Empty / null handling

- If `pickup_time IS NULL`: omit the row.
- If `payment_status` is not `"paid"`: omit the payment confirmation line
  entirely. Don't print "טרם שולם" — the absence of a confirmation is
  itself the signal, and printing "unpaid" on the customer's slip is
  awkward.

---

## 5. Combined print route — `/print/order/:id`

Returns a single HTML document containing **both** documents:

```html
<!doctype html>
<html dir="rtl" lang="he">
  <head>
    <title>הזמנה #12</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/print.css" />
  </head>
  <body>
    <section class="page kitchen-bon">
      <!-- kitchen bon content -->
    </section>
    <section class="page customer-slip">
      <!-- customer slip content -->
    </section>
  </body>
</html>
```

The `.page` class applies `page-break-after: always`. The `:last-child`
rule prevents a trailing blank page.

The frontend's "שמור והדפס" button:

1. POSTs the order to `/api/orders`.
2. On `201`, opens `/print/order/<new id>` in a new tab.
3. The new tab's `<body onload>` triggers `window.print()` automatically.
4. After the print dialog closes (success or cancel), the tab can close
   itself with `window.close()` (works because the tab was opened by
   script).
5. Original tab redirects to `/orders/today` with a success toast.

### 5.1 Print timestamp side effects

The combined route sets both `kitchen_printed_at` and
`customer_printed_at` to `new Date().toISOString()` if either is `NULL`.
**Idempotent** — re-renders do NOT update existing timestamps. This
captures the *first* print time honestly and stops there.

The standalone routes (`/print/order/:id/kitchen`,
`/print/order/:id/customer`) update only their respective field.

---

## 6. Bonim file — `/print/bonim/:date`

End-of-day archive. All kitchen bons for a given `order_date`,
concatenated, each on its own A4 page.

### 6.1 Structure

```html
<!doctype html>
<html dir="rtl" lang="he">
  <head>
    <title>קובץ בונים — יום שישי 15.5.2026</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/print.css" />
  </head>
  <body>
    <section class="page kitchen-bon"> <!-- order #1 --> </section>
    <section class="page kitchen-bon"> <!-- order #2 --> </section>
    <section class="page kitchen-bon"> <!-- order #3 --> </section>
    ...
  </body>
</html>
```

- Sorted by `daily_number ASC` (i.e., entry order for the day).
- Same kitchen bon component, reused. No customer slips in the bonim file.
- No additional cover page or table of contents in v1.

### 6.2 Side effects

**None.** The bonim file does NOT update `kitchen_printed_at` on any
order — those orders have already had their kitchen bons printed
individually. The bonim file is an archive snapshot, not a "first print."

### 6.3 Empty case

If no orders exist for the requested date, the route returns `200` with
an HTML page containing a single message: *"אין הזמנות ליום זה"*. The
operator can still hit "Save as PDF" and get an empty-but-valid file.

### 6.4 Access

A button on the daily summary screen (`/summary/today`):

> **[ הדפס קובץ בונים של היום ]**

Opens `/print/bonim/:date` in a new tab and triggers `window.print()`.
The operator can print to paper or "Save as PDF" via the print dialog —
same code path.

---

## 7. Re-print scenarios

The order detail screen exposes three re-print buttons (see
`docs/04-screens-and-flows.md` section 4.3):

- `[הדפס שוב — בון מטבח]` → opens `/print/order/:id/kitchen`.
- `[הדפס שוב — שובר לקוח]` → opens `/print/order/:id/customer`.
- `[הדפס שניהם]` → opens `/print/order/:id` (combined).

All three open in a new tab and trigger `window.print()`.

**Re-prints do NOT update the print timestamps.** The timestamp captures
the first print, which is the operationally meaningful one (the "did I
print this yet?" signal).

---

## 8. Printer-side considerations (operational)

These are deployment concerns, documented here so they're not lost:

- The operator's printer is a regular A4 inkjet/laser. There is no
  thermal/POS printer integration in v1.
- Print dialog popups are normal — the operator clicks "Print" each
  time. Silent printing is browser-restricted and not pursued in v1.
- If the printer is offline, the browser's print dialog handles the
  error. The order is already saved in the DB. The operator re-prints
  via the order detail page when the printer is fixed.
- For the very first run on uncle's laptop, do a print smoke test:
  create one fake order, print the combined doc, verify both pages come
  out correctly oriented with Hebrew rendering as expected. Adjust
  `print.css` if specific issues appear (font fallback, margin clipping,
  etc.).

---

## 9. What this print pipeline explicitly does NOT include

- Custom bon designs per category or per order type.
- Logo / image embedding (text-only headers in v1).
- Barcodes or QR codes.
- Multi-language print (Hebrew only).
- Email-as-PDF or any digital delivery — print pipeline is paper-only.
- Direct printer integration (we do not bypass the browser print
  dialog).
- Print queue management or print job retries — that's the OS's
  responsibility.
- Print preview within the app — the browser's print preview is the
  preview.

If any of the above is needed later, it is out of v1 scope. See
`docs/07-out-of-scope.md`.