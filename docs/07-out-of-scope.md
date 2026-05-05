# 07 — Out of Scope (v1)

This document is the wall.

The single most common reason a portfolio project fails to ship is not
technical difficulty — it's scope creep. Two months in, the temptation
strikes to add SMS notifications, a customer-facing order page, an
analytics dashboard, an AI summarizer. Each of these is a 20-hour rabbit
hole that delays launch and never gets finished.

This document is the artifact you point at when temptation strikes mid-
build. Anything listed here is **explicitly NOT in v1**. Adding it is
not a small decision — it requires re-grilling, updating the spec, and
acknowledging the scope expansion.

---

## 1. AI features — zero, by commitment

**v1 contains zero AI features.**

This is a deliberate, recorded commitment from the product grilling.
Any AI integration is post-v1, considered only after v1 ships and is
in real use.

This means no:

- LLM-powered anything.
- Smart categorization, smart suggestions, smart search.
- Natural-language queries over the order data.
- Auto-generated summaries.
- Voice input or transcription.
- Recommendation engines.
- Embedding-based customer matching.
- Any feature that reaches for an AI API as part of its primary path.

**If the temptation arises mid-build:** do not add it. The architecture
is designed to make a post-v1 AI layer easy to bolt on (clean REST API,
structured data, well-defined operations). v1 ships first.

---

## 2. Customer-facing features

NATI's is an internal operator tool. The customer never touches the app.

**Not in v1:**

- Public order page where customers place their own orders.
- Customer accounts, customer login, customer self-service.
- Customer-facing order status pages ("track my order").
- SMS notifications to customers ("your order is ready").
- WhatsApp Business API integration.
- Email confirmations or receipts to customers.
- Any URL or feature reachable by a customer.

The customer's only interface is:
1. The phone call / WhatsApp message with the operator (out-of-app).
2. The printed customer slip on the food bag at pickup.

That's it. No exceptions in v1.

---

## 3. Online payments

**Not in v1:**

- Credit card processing (Stripe, Tranzila, CardCom, Pelecard, etc.).
- Payment links sent to customers.
- Bit / PayBox / cash-app integrations.
- Tipping flows.
- Refund flows.
- Receipt-to-tax-authority integrations (חשבונית).
- Any feature that processes money inside the app.

The app **records** payment method (`cash` / `credit`) and status
(`paid` / `unpaid`) as data fields. The actual payment happens
out-of-band — physical cash, an external card reader, etc.

If integrated payment ever becomes a real requirement, it's a major v2
conversation that involves PCI considerations, real auth, and probably
a different deployment model.

---

## 4. Multi-user / staff features

**Not in v1:**

- Multiple user accounts.
- Roles (admin, staff, kitchen, etc.).
- Permission systems.
- Audit logs of "who did what."
- Shift / clock-in / clock-out tracking.
- Staff scheduling.
- Per-user activity views.
- Real-time collaboration features.

The app has exactly one operator. Authentication is a single shared
password (see `docs/06-policies-edge-cases.md` section 4).

---

## 5. Real-time and kitchen-display features

**Not in v1:**

- Kitchen display screen / KDS (the chef uses paper bons only).
- WebSocket real-time order push.
- Server-Sent Events.
- Live order status updates pushed to a tablet.
- Auto-advancing order queues.
- Order "bumping" workflows.
- Sound alerts when new orders come in.

The kitchen interface is paper. The phone is the operator's secondary
device, not the chef's.

---

## 6. Operational features

**Not in v1:**

- Inventory tracking ("we have 12 ברסקט left").
- Ingredient / recipe management.
- BOM (bill of materials) for menu items.
- Cost-of-goods entry per item.
- Profit margin reporting.
- Waste / spoilage tracking.
- Supplier management.
- Purchase order tracking.
- Labor cost tracking.
- Table management.
- Floor plans.
- Dine-in support of any kind.
- Reservations.
- Walk-in queueing.
- Delivery management, drivers, delivery zones, dispatch.
- Pre-order modification by customers after submission.

NATI's is a Friday-only, pickup-only, single-operator home restaurant.
Any feature that doesn't fit that exact shape is out of scope.

---

## 7. Analytics and reporting

**Not in v1:**

- Weekly / monthly / yearly trend charts.
- Year-over-year comparisons.
- Customer segmentation (heavy buyers, lapsed customers, etc.).
- "Best day of the year" leaderboards.
- Sales forecasting.
- Cohort analysis.
- Funnel analysis.
- Heat maps of busy times.
- Export to accounting software (Hashavshevet, Priority,
  ריווחית, etc.).
- Dashboards beyond the daily summary.

The daily summary on `/summary/today` is the **only** reporting surface
in v1. It shows: order count, total revenue, payment breakdown, items
sold (per-row and rolled-up). Nothing else.

The `[יצוא JSON]` button on the daily summary is the only data-export
path. Operators or the developer can do further analysis externally if
desired.

---

## 8. Native mobile apps

**Not in v1: native iOS or Android apps.**

The phone access pattern is: the operator opens his phone's browser,
navigates to `http://<laptop-lan-ip>:3000`, and uses the responsive web
app. This is already in v1 scope. The operator may bookmark the URL or
add it to his home screen, but the app is not a PWA in the
service-worker / installable sense.

Specifically not in v1:
- React Native build.
- Capacitor / Cordova wrapper.
- App Store / Play Store presence.
- Service workers, offline caching, push notifications.
- A `manifest.json` with installable metadata.
- App icons beyond a favicon.

If "make it installable" ever becomes a real ask, a PWA shim is a small
post-v1 addition. Not a v1 feature.

---

## 9. Internationalization

**Not in v1:**

- An i18n framework (`react-i18next`, `react-intl`, `format.js`).
- An English UI.
- Locale switching.
- Right-to-left as a configurable option (it's a hard requirement, not
  a setting).
- Translation files.
- Pluralization rules per locale.

Hebrew strings are inline literals in React components. RTL is hardcoded
at the `<html>` element and via Tailwind's logical properties.

If an English UI ever becomes necessary (e.g., for a recruiter demo),
adding `react-i18next` later is a contained refactor. Not a v1 feature.

---

## 10. Polish and customization features

**Not in v1:**

- Dark mode.
- Theme customization.
- Logo upload.
- Custom bon layouts beyond what's specified in
  `docs/05-print-spec.md`.
- Custom color schemes per restaurant.
- Multi-restaurant support (one restaurant is hardcoded into
  `config.json`).
- Per-operator preferences stored in the DB.
- Drag-and-drop UI customization.

The visual design is functional, RTL-correct, and not configurable.

---

## 11. Engineering polish

**Not in v1:**

- CI / CD pipelines (GitHub Actions, etc.).
- Automated deploy (the deploy is `git pull && npm run build && pm2
  restart`).
- 100% test coverage as a goal. Aim for tests on the schema and
  business-logic layer (line totals, daily numbering, summary
  aggregation, snapshot pattern). UI tests are nice-to-have, not
  required.
- E2E tests with Playwright / Cypress (Tier 2 if time permits at the
  end).
- Containerization with Docker. The deploy is a laptop, not a
  container host.
- Kubernetes / orchestration of any kind.
- A real auth system (OAuth, JWT, refresh tokens, password reset
  flows). The single shared password is the entire auth model.
- Per-endpoint rate limiting beyond Express middleware defaults.
- Distributed tracing.
- Sentry / error tracking infrastructure.
- Application performance monitoring (APM).
- Health check / readiness probe endpoints.
- Metrics endpoints (Prometheus etc.).
- Structured logging frameworks (a console.log + log file is fine).
- Migrations as code beyond Drizzle's built-in `migrate` command.
- Multiple deployment environments (no staging / no production —
  there's just the laptop).

---

## 12. Hardware integrations

**Not in v1:**

- Thermal POS printer support (ESC/POS, Epson TM-T20, Star TSP100,
  etc.). The operator uses a regular A4 printer.
- Cash drawer integration.
- Barcode / QR scanner input.
- Receipt printer auto-cut commands.
- Card reader integration.
- Customer-facing display screens.
- KDS hardware.

The only hardware integration in v1 is "the browser sends to the
default printer via the print dialog."

---

## 13. Things that look small but aren't

These are features that *seem* like quick wins but would each open
significant scope:

- **"Just a one-line history" of edits per order.** That's an
  audit-log subsystem. Not in v1.
- **"Just a graph of orders per week."** That's a charting library +
  a date-range query + a new screen + ongoing maintenance. Not in v1.
- **"Just an export to Excel."** XLSX generation in Node, schema
  decisions for the export shape, RTL handling in spreadsheets.
  JSON export covers the use case in v1.
- **"Just a quick AI summary at end-of-day."** No. See section 1.
- **"Just an undo button on delete."** That's a soft-delete subsystem.
  Two-step confirmation (already specified) is sufficient.
- **"Just a notification when an order comes in."** WebSockets, push
  permissions, browser API surface. Not in v1.

The pattern: any feature whose description contains the word "just"
deserves extra scrutiny.

---

## 14. The escalation rule

If, mid-build, a real need arises that's listed in this document:

1. **Do not add it without an explicit re-grilling session.**
2. Document the need (what specific user pain does it solve?).
3. Decide whether to:
   a. Add it to v1 (and accept the schedule slip), OR
   b. Defer to a written `v2.md` doc and continue with v1.
4. If (a), update this doc to remove the item from out-of-scope, and
   update the relevant other docs (spec, schema, API, screens,
   policies) to add the new behavior.

The rule exists to prevent silent scope creep. Conscious scope changes
are fine; unconscious ones kill projects.

---

## 15. The non-negotiables

Two items in this list are not subject to "well, maybe in v1 if the
user really wants it":

1. **Zero AI features in v1.** Recorded commitment. AI is post-v1
   only.
2. **No internet exposure.** The Express server binds to the LAN.
   No port forwarding, no tunnels, no public DNS pointing at the
   laptop.

Everything else is moveable in principle if the case is strong enough
and the spec is updated accordingly. These two are not.