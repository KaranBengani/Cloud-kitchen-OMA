# OMA plan

Phase 1 (V1a) is built by Claude; Phase 3 (V1b) is built by Karan. See `DECISIONS.md` D1.

**Target:** parents using V1a on real orders by **Sun 8 Nov 2026**, leaving a week of real-use fixes before the
hard deadline of **Sun 15 Nov**. V1b due **Sun 20 Dec**.

## Phase 0: setup (Karan, ~30 min)
- [x] Create free accounts: GitHub, Neon, Render, Expo
- [ ] Confirm the Proposed decisions in `DECISIONS.md` (D6–D9, D11)
- [ ] Android phone with USB debugging or Expo Go, for testing

## Phase 1: V1a (Claude builds, Karan reviews and tests)
**Milestone, Wed 4 Nov (home visit):** an installable APK on all three phones with over-the-air updates working
and every native module V1a needs already included. After that, every feature reaches parents' phones remotely.
Native changes later would need a reinstall, which can't happen in person again before 15 Nov.
- [ ] Monorepo scaffold: `apps/mobile` (Expo), `apps/api` (NestJS), shared lint/format, local Postgres via Docker
- [x] API: TypeORM config, first migration, health endpoint, PIN auth
- [ ] DB + API: menu items (CRUD), seeded from the current Canva menu
- [ ] DB + API: customers (name, phone, address), search by name or phone
- [ ] DB + API: orders + order items (price snapshot + override, order-level notes, delivery date and time, status), optimistic locking
- [ ] DB + API: payments (Cash / UPI Papa / UPI Mummy, advance) and balance due
- [ ] Deploy: API on Render, DB on Neon, keep-alive ping, env secrets
- [ ] App: PIN screen, English/Hindi toggle, tab layout
- [ ] App: menu screen (add, edit, hide/show, delete), share menu as WhatsApp text
- [ ] App: new order flow (customer pick or add → items and quantities → overrides → notes → date and time)
- [ ] App: order detail + edit (with conflict message), add payment, cancel
- [ ] App: upcoming orders list + calendar view
- [ ] App: "Who owes money" screen
- [ ] App: WhatsApp text bill (opens the customer's chat directly)
- [ ] EAS build: APK on all three phones, over-the-air updates working
- [ ] Parents take real orders in parallel with the notebook for one week
- [ ] Fix what real use reveals; drop the notebook when parents are confident

## Phase 2: learn the codebase (Karan, with Claude, alongside Phase 1 week 2)
For each module: Claude walks through it, Karan explains it back, answers interview questions, then rewrites
or extends one piece himself. Log each session in `LEARNING_LOG.md`.
- [ ] Expo Router, navigation and screens (vs React web routing)
- [ ] Data fetching and state in the app (vs web)
- [ ] NestJS modules, controllers, services, DI (vs Spring Boot)
- [ ] TypeORM entities, relations, migrations (vs JPA/Hibernate)
- [ ] Orders: price snapshots, totals, optimistic locking
- [ ] Auth, deployment, environments, secrets

## Phase 3: V1b (Karan builds, Claude mentors), due 20 Dec
- [ ] Earnings tab
- [ ] Monthly running costs
- [ ] Revenue and profit analysis
- [ ] Total time worked
- [ ] Menu and festive-offer broadcast to the WhatsApp group (maybe a generated menu image)
- [ ] Bill as PDF

## Answered (2 Nov)
- Delivery via Uber parcel / Rapido etc.; the customer pays the delivery cost directly. Orders store pickup vs parcel and the address; no delivery charge in the bill.
- Advance refunds: mostly no, occasionally yes. Cancel keeps payments; an optional refund is recorded as a negative payment.
- Installs are remote, except Karan is home on **Wed 4 Nov**: install the APK on all phones then. After that, updates go over the air.
