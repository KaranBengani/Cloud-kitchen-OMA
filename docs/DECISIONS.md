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

## D13. Discounts (Accepted, 2 Nov 2026)
Both: the unit price of any order line can be overridden (D7), **and** an order can carry one optional discount
amount in paise. Total = sum of line totals − discount. Needs an `orders.discount_paise` column (default 0, ≥ 0,
≤ subtotal).

## D14. Custom (off-menu) items (Accepted, 2 Nov 2026)
An order line may have no menu item: name, unit and price are typed on the order and are not added to the menu.
`order_items.menu_item_id` is already nullable; the DTO gains a custom-item variant.

## D15. Design direction (Accepted, 2 Nov 2026)
Stitch designs reviewed (see `docs/design/STITCH_REVISION_PROMPT.md`). Rust red primary, mustard highlights, brown text,
cream background; tall order cards; centre New Order tab. Cut from V1a: header status/avatar, photos, stock tracking,
printer/KOT, delivery charges, offline mode, kitchen open toggle, PDF/QR bill. The WhatsApp bill has **no UPI line**
(D10). Note chips: Less spicy, Less oil, No onion-garlic, Extra chutney, Separate boxes. P&L and expenses designs are kept
in `docs/design/v1b/` for Phase 3.

## D16. Staging environment (Accepted, 3 Nov 2026)
Testing on the real app would create fake orders in the parents' data. A separate, free staging copy:
- **DB:** Neon branch `staging` (same project), created before real data existed.
- **API:** Render service `oma-api-stg` from the same `render.yaml`, not kept awake.
- **App:** the `preview` EAS profile sets `APP_VARIANT=staging` → "Mummy's Kitchen (Test)", package
  `com.karanbengani.oma.stg`, grey icon; installs next to the real app. Its updates go on the `preview` channel.
- **Flow:** test on staging → publish the same update to `production`.

## D17. Public web menu (Accepted, 4 Nov 2026)
The Canva PDF was a second copy of the prices that went stale whenever the menu changed in the app. The API now serves
`GET /menu`: one HTML page that looks like the Canva card (same fonts Berkshire Swash and Lato, same colours, cover and
banner images cut from the PDF) and lists **available** items straight from `menu_items`. The app's "Share menu" sends
this link instead of a long WhatsApp text.
- **Options:** API-rendered page (chosen) · static site that fetches JSON (a second deploy, CORS) · regenerated image/PDF
  (more moving parts). Rendered on the server so it needs no JavaScript and WhatsApp's link preview reads the meta tags.
- **Public by design:** only menu fields are shown; orders and customers stay behind the PIN. Cached 60 s.
- **Trade-offs:** outside 07:00–23:00 the free server may be asleep, so the first visit can take ~1 minute.
  Momo-style variants show as two lines (they are two items, D8). A custom domain can be added later.

