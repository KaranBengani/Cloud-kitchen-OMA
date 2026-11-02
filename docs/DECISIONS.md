# Decisions

One entry per architecture decision: context, options, choice, why.
Status is **Accepted** (Karan chose) or **Proposed** (Claude's default, Karan to confirm or change).

---

## D1. Who builds what (Accepted, 2 Nov 2026)
**Context:** V1a must be in real use by 15 Nov (hard date). Karan has ~1 h on weeknights, 4–6 h on weekends,
and no React Native or real backend experience yet.
**Options:** (a) Karan builds everything with Claude mentoring, parents use it around late Dec. (b) No-code stopgap
(Sheets/AppSheet) now, real app later. (c) Claude builds V1a end to end, Karan learns from the working app,
then owns V1b.
**Choice:** (c).
- **Phase 1 (V1a):** Claude writes the code; Karan defines behaviour, reviews every PR, tests with parents.
- **Phase 2:** module-by-module walkthroughs, explain-back, interview questions, Karan rewrites or extends one piece per module.
- **Phase 3 (V1b):** Karan builds earnings, costs, profit, time and broadcast features himself; Claude goes back to mentor mode.
**Why:** parents get a working app quickly; Karan learns on a real, used codebase; the backend-heavy V1b
(aggregations, reporting) is fully his work.

## D2. Stack and free hosting (Accepted, 2 Nov 2026)
- **App:** Expo (React Native) + TypeScript + Expo Router, Android only.
- **API:** NestJS + TypeScript, hosted on **Render** free web service. Mitigate the ~15 min idle sleep with a scheduled ping.
- **DB:** PostgreSQL on **Neon** free tier.
- **Builds/updates:** Expo EAS (APK builds + over-the-air updates so fixes reach parents' phones without reinstalling).
- **Rejected:** Supabase-as-backend (faster but skips the NestJS learning).
- Free-tier limits change; re-verify at setup.

## D3. ORM: TypeORM (Accepted, 2 Nov 2026)
**Options:** Prisma (generated, query-shaped types; own schema DSL), TypeORM (decorated entity classes, close to JPA), Drizzle.
**Choice:** TypeORM.
**Why:** maps almost one-to-one onto JPA/Hibernate, which Karan learns next; first-class `@nestjs/typeorm` module.
**Accepted costs and guard rails:**
- Relation types don't reflect what was loaded → load relations explicitly and test the endpoints that return them.
- `synchronize` is **always false**; schema changes go through generated, reviewed migrations.
- Optimistic locking needs an explicit conditional update (see D6), not just `@VersionColumn`.

## D4. Auth: one shared family PIN (Accepted, 2 Nov 2026)
The API is on the public internet, so it can't be open. One PIN for the family; app exchanges it for a
long-lived token stored with `expo-secure-store`. Per-person accounts later if needed.

## D5. Online-only, no offline mode (Accepted, 2 Nov 2026)
Kitchen internet is reliable. Offline-first means a local DB, sync queue and conflict resolution: weeks of work.
App shows a clear "no connection, retry" state instead.

## D6. Concurrent edits: optimistic locking (Proposed)
**Context:** Mum, Dad and Karan can all edit; two people editing the same order at once is rare but possible.
**Choice:** each order has a `version` integer. The app sends the version it loaded; the server runs
`UPDATE ... WHERE id = :id AND version = :v` and bumps the version. 0 rows updated → `409 Conflict`; the app says
"Someone else changed this order. Reload to see their changes."
**Why:** never silently loses an edit, costs no locks, fits rare conflicts. Pessimistic locking (holding a lock while
someone types) suits frequent contention, which we don't have. JPA equivalent: `@Version`.

## D7. Money and quantities (Proposed)
- Money as **integer paise** (`₹400` → `40000`). No floating-point rounding errors.
- Quantity as **decimal** (`numeric(10,3)`), because items are sold per kg (0.25, 0.5, 1.5 kg) as well as per piece, plate, bowl or roll.
- Each order item **copies** name, unit and unit price at order time, so later menu price changes don't rewrite old orders. The copied price is what gets overridden for customer modifications.

## D8. Menu model (Proposed)
From the current Canva menu:
- Item: name, category (Namkeen, Snacks & Chaats, Thali & Combos, Dessert), unit (kg, pc, plate, bowl, roll, pizza),
  price per unit, minimum quantity (e.g. 0.5 kg, 10 pc, 2 plate), optional description ("6 pcs/plate"), available flag
  (for seasonal items like Gajar Halwa).
- Variants like "Veg/Paneer steam momo 100/140" become **two separate items**. Simpler than a variants table, and fine at this size.
- Minimum quantity is a **warning**, not a hard block. Parents decide exceptions.
- The app is the **source of truth for prices**. The Canva card stays the designed menu for now; the app can share
  the menu as WhatsApp text. A generated menu image fits with the V1b broadcast feature.

## D9. Payments and dues (Proposed)
- Separate `payments` rows per order: amount, mode (**Cash / UPI Papa / UPI Mummy**), date, advance or not.
- Balance due = order total − sum of payments, computed and never stored, so it can't drift.
- A "Who owes money" screen lists orders with balance > 0.

## D10. Bill format (Accepted, 2 Nov 2026)
Not GST-registered, so a formatted **WhatsApp text bill** for V1a. PDF later.

## D11. Language (Proposed)
English UI with an in-app **English/Hindi toggle** per phone (Mum uses Hindi). Strings go in translation files from
day one, which is cheap now and expensive to retrofit. Menu item names stay as typed.

## D12. Delivery and refunds (Accepted, 2 Nov 2026)
- Delivery is by third-party parcel services (Uber, Rapido); the **customer pays the courier directly**. Orders store
  fulfilment type (pickup / parcel) and the address, with no delivery charge line.
- Refunds are rare: cancelling keeps recorded payments; a refund is an explicit negative payment, so totals and dues stay correct.
