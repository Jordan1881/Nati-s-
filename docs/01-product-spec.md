# 01 — Product Spec

This document defines what NATI's Order Management is, who it's for, and why
it exists. It's the foundation for every other document. If a decision in a
later doc seems to conflict with this one, this one wins.

---

## 1. Product summary

A local-first, single-user web application for managing pre-orders at a
Friday-only home restaurant — **NATI's — בישול ביתי & חומוס**, located in
קיבוץ מחניים, Israel.

The operator (the developer's uncle) collects orders Thursday by phone and
WhatsApp, enters them into the system, and on Friday morning prints two
documents per order: a **kitchen bon** for the chef, and a **customer slip**
that goes on the food bag at pickup. At end-of-day, the system produces a
per-item quantities summary, payment breakdown, and a printable file of all
kitchen bons.

The app is hosted on Vercel and is reachable from his laptop and phone via
the internet.

---

## 2. The user

**Single operator.** The developer's uncle, ~60 years old, runs the
restaurant. He is not a technical user. The app must be usable by him with
zero training and survive a real Friday lunch service.

There are no other users:

- The chef does not use the app — he reads paper kitchen bons.
- Customers do not use the app — they call or WhatsApp the operator.
- The developer is the architect and maintainer, not a recurring user.

---

## 3. The current pain (what we're replacing)

The operator currently:

1. Collects orders Thursday in a paper notebook by hand.
2. Communicates orders to the kitchen verbally from across the room or via
   torn paper scraps.
3. Has no order numbering and no status tracking.
4. Hand-counts daily totals at end-of-day in the notebook.

The pain points this creates:

- **Kitchen miscommunication** — verbal/handwritten orders get mis-cooked,
  no paper trail.
- **No end-of-day visibility** — counting per-item totals by hand is slow
  and error-prone.
- **No order pairing** — when 5 customers arrive within 10 minutes for
  pickup, it's hard to match each food bag to its owner.
- **No history** — no way to look up "what did this customer order last
  Friday."

---

## 4. Goals (v1)

- Replace the paper-notebook workflow with structured digital intake.
- Eliminate kitchen miscommunication via printed bons.
- Pair each food bag with a printed customer slip showing name, phone,
  pickup time, items, and total.
- Give end-of-day visibility (per-item totals, payment breakdown, list of
  unpaid orders).
- Rely on Vercel's high availability; the app requires a stable internet connection on Friday morning.
- Be operable by a non-technical user with no training.

---

## 5. Non-goals (v1)

See `docs/07-out-of-scope.md` for the full list. The headline non-goals are:

- No customer-facing features (no public order page, no SMS, no email).
- No multi-user support.
- No native mobile apps.
- No AI features in v1.
- No analytics dashboards beyond the daily summary.

---

## 6. The 90-second pitch

> NATI's is a Friday-only order management system built for a real home
> restaurant that ran on pen and paper for years. It's a web app hosted on
> Vercel with a Supabase PostgreSQL backend that captures orders, prints
> kitchen and customer documents on a regular A4 printer, and produces a
> clean end-of-day summary. Built RTL-first in Hebrew. Reachable from the
> operator's laptop and phone anywhere with internet. The architecture
> prioritizes correctness — snapshot pattern in the schema so historical
> orders survive menu changes, server-rendered print views so the kitchen
> interface (paper) is decoupled from app state.

---

## 7. Definition of success (v1)

The operator uses the app for **one full Friday cycle** — Thursday entry
through Friday morning prints through Friday end-of-day summary — without
falling back to the notebook for any order.

Full DoD criteria are in `docs/09-definition-of-done.md`.