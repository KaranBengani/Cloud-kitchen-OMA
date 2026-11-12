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
- **Revised 6 Nov (Karan):** `orders.paid_paise` now **stores** the sum of payments, updated in the same transaction
  as every payment insert or delete (`paid_paise = paid_paise + amount` in SQL, so concurrent payments can't overwrite
  each other). Dues reads only a partial index of orders that still owe money or a refund
  (`IDX_orders_open_balance`), and customer search no longer adds up the payments table. Chosen while data is small,
  so the backfill is trivial. Drift risk is contained by writing payments only through `OrdersService`.
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

## D18. Kitchen holidays (Accepted, 6 Nov 2026)
`kitchen_holidays` holds date ranges (start, end inclusive, optional note such as "Diwali"). Parents manage them in
Settings → Kitchen holidays. The public menu shows "Kitchen closed …" for holidays in the next 60 days; the web order
form (D19) won't offer those dates. In the app's New Order a holiday only **warns**: parents may still book by choice.
Upcoming holidays and the public menu are cached in server memory and cleared on every write, so customers browsing
the link don't wake the Neon database (compute is billed for time awake, not query size).

## D19. Online ordering from the menu link (Accepted, 6 Nov 2026; Claude builds)
- **No customer login.** The mobile number identifies the customer (normalised to `91XXXXXXXXXX`, unique index).
  Same number → same customer row; names are not matched (two people can share a name). An existing customer's saved
  name is kept; a different typed name is shown on the request.
- **Privacy:** without login the page never reveals saved addresses or details for a typed number.
- **Addresses:** `customer_addresses` (label Home / Office / Friend or family / Other, optional recipient name and
  phone, address text), deduplicated per customer. The app's customer list and New Order read the same rows.
- **Web orders arrive as "requested"** and parents **accept** (→ booked) or **decline**. Parents hear about new
  requests by push notification and confirm to the customer from the app (D20); the customer's page no longer asks
  them to send the order on WhatsApp. After Accept or Decline the app offers a ready-typed WhatsApp message (confirmation
  or a polite decline), and the order screen keeps a button for it if they tapped "Later".
- **Minimum quantities are not enforced** on the web: below-minimum orders are reviewed by parents like any request.
- **Delivery time** is any time the customer picks (optional), not fixed slots. Same-day orders ask the customer to call first;
  off-menu items: place the order, then call. Delivery is by Rapido/Uber parcel, paid by the customer (D12).
- **Abuse limits:** 10 tries an hour per network on `POST /order`, 30 web orders an hour overall, a honeypot field,
  caps on items (40) and text lengths. Rate limits count the visitor's real address from Cloudflare's
  `CF-Connecting-IP` (Render's proxy would otherwise make everyone share one limit; this also stops a stranger's wrong
  PINs from locking the family out of login).
- **Statuses:** `requested → booked` (Accept) or `requested → declined` (final). Requests and declined orders are
  left out of the day list, calendar, Dues and customer balances. Orders tab shows requests on top with a badge; the
  app refreshes when brought to the foreground (no polling, so the database can sleep).


## D20. Online ordering switch, confirmations and new-order alerts (Accepted, 6 Nov 2026; Claude builds)
- **Switch:** Settings → Online orders (`kitchen_settings`, one row, starts **off**). Off: the menu link is a plain
  menu with the WhatsApp button, and `POST /order` answers 403. Cached in server memory like the menu; the page itself
  is cached for a minute, so a change shows within about a minute.
- **Confirmation to the customer:** after Accept, the app offers "Send confirmation", which opens the customer's
  WhatsApp chat with the order typed in (date, pickup/delivery, items, total). Also a button on accepted web orders.
  WhatsApp Business API was not used: it costs per message and needs Meta approval; parents tapping send is free.
- **New-order alerts:** push notifications through Expo's push service (free; Android delivery via Firebase Cloud
  Messaging). The app registers its push token after login; a web order sends one notification to every registered
  phone, and tapping it opens the request. This adds a native module, so it ships in app version 1.1.0, which parents
  install once; over-the-air updates for 1.0.0 stay JavaScript-only.
- **Staging branch:** `oma-api-stg` deploys from the `staging` branch. Feature PRs merge into `staging` first, get
  tested in the Test app, then `staging` merges into `main` (production).

## D21. Parents' feedback after a few days of use (Accepted, 12 Nov 2026; Claude builds; app 1.2.0)
- **Hindi menu names:** `menu_items.name_hi`, filled for the current menu by a migration (matched on the English
  name) and editable in the item form. Hindi mode shows it in the app; orders keep their English copy and look the
  Hindi name up by `menuItemId`. Customers always get English (bills, messages, the web menu).
- **Orders opens on the month calendar**, with web requests above it, as in the week view.
- **Pick a customer from the phone's contacts** (`expo-contacts`, read-only: `WRITE_CONTACTS` blocked). A picked
  contact who is already a customer is selected directly; otherwise the new customer form is filled in.
- **Order chime:** an original 3-second chime (generated, no licence issue) on a new Android channel `new-orders`.
  Plays once per notification at the phone's notification volume; silent and Do Not Disturb still mute it.
  A ringing alert that repeats until opened (like Rapido's partner app) was not built: it needs a foreground service
  and full-screen-intent permission, which is a lot of native code for a few orders a day.
  Each phone registers the channel it has (`push_tokens.channel_id`), so 1.1.0 phones keep getting alerts on
  `orders` until they update.
- **Orders added in the app alert the other phones** ("New order #N added", same chime); the adding phone sends its
  push token in `X-Push-Token` and is left out. A 1.1.0 phone doesn't send it, so it also alerts itself.
