# Stitch prompt for OMA

Paste everything below the line into Stitch (mobile, Android). Generate all screens in one project so they share
one style. Export each screen as an image and, if Stitch allows, its HTML/CSS, into `docs/design/`.

---

Design an Android mobile app called **"Mummy's Kitchen"**: an order management app for a small home-run
Indian cloud kitchen. It is used only by the family that runs the kitchen (a mother, a father in their 50s, and
their son), never by customers. Orders come in over WhatsApp and phone calls and are typed in by hand.

## Users and constraints (these drive every design choice)
- Primary users are parents in their 50s, comfortable with WhatsApp and UPI apps, typing in English, but the
  mother prefers **Hindi labels**. Every screen must work in both **English and Hindi (Devanagari)**; leave room
  for Hindi text being ~30% longer.
- Used in a busy kitchen, often one-handed: **large text (body 18sp minimum), large touch targets (48dp+, primary
  buttons 56dp)**, high contrast, few taps, minimal typing, no tiny icons without labels.
- Clarity over decoration. It should feel warm and homely, not like a corporate dashboard.

## Brand and visual style
- Match the kitchen's existing printed menu: **warm mustard yellow (#F2C35E)**, **dark chocolate brown (#5A2E0C)**,
  **cream background (#FBF6EE)**, white cards, terracotta/orange accents, a hint of leaf green for success states.
- Friendly rounded shapes (12–16dp corners), soft shadows, generous spacing.
- Headings may use a warm, slightly decorative serif or rounded display font; body text a highly legible sans-serif
  that renders Devanagari well (e.g. Noto Sans / Mukta).
- Prices always in rupees, Indian format: ₹1,250. Quantities can be decimal for kg (0.5 kg, 1.25 kg).

## Navigation
Bottom tab bar with 5 labelled tabs (icon + text): **Orders**, **New order** (visually emphasised), **Menu**,
**Dues**, **Settings**.

## Screens to design

1. **PIN login**: app name at top, "Enter PIN", six large dots, a big numeric keypad (3×4) with a delete key,
   an inline error area ("Wrong PIN, try again"). No keyboard, no username.

2. **Orders: upcoming list (home)**: a horizontal week strip of dates at top (today highlighted, dots on days
   with orders), toggle to a **month calendar view**. Below, orders grouped by day ("Today", "Tomorrow",
   "Sat, 14 Nov"). Each order card: delivery time slot, customer name, short item summary
   ("Khandvi 1 kg, Dal Kachori ×20 +2 more"), pickup or parcel badge, total, and a **payment status chip**:
   Paid (green), Advance ₹500 / ₹1,250 (amber), Unpaid (red). Status chips for Booked / Ready / Delivered / Cancelled.
   Include an empty state for a day with no orders.

3. **Orders: month calendar view**: full month grid, each date showing the number of orders; tapping a date
   shows that day's orders below.

4. **New order: step 1, customer**: search existing customers by name or phone (list of results with name,
   phone, last order date), or "Add new customer" (name, phone, address). Recent customers shown first.

5. **New order: step 2, items**: menu grouped by category (Namkeen, Snacks & Chaats, Thali & Combos, Dessert)
   with a search bar. Each row: item name, small description ("6 pcs/plate"), price per unit ("₹400 / kg",
   "₹20 / pc", "₹120 / plate"), and a large quantity stepper. For kg items, quick chips: ¼ kg, ½ kg, 1 kg, 2 kg.
   Show a soft warning when quantity is below the item's minimum ("Minimum ½ kg"), not an error.
   Sticky bottom bar: item count + running total + "Next".

6. **New order: step 3, review and details**: line items, each with quantity and price; **tap a price to override
   it** (show the original menu price struck through next to the new one, with a small "edited" tag). Order-level
   **special cooking notes** (multi-line, e.g. "less oil, no onion"). Delivery date picker and time slot,
   Pickup / Parcel toggle with address for parcel. Optional **advance payment** (amount + mode: Cash, UPI Papa,
   UPI Mummy). Big "Save order" button. Total at the bottom.

7. **Order detail**: everything about one order, status stepper (Booked → Ready → Delivered, plus Cancelled),
   payments list with "Add payment", balance due shown prominently, actions: **Edit**, **Send bill on WhatsApp**
   (WhatsApp green button), Call customer, Cancel order.
   Also show a dialog: "Someone else changed this order. Reload to see their changes."

8. **Bill preview**: a preview of the WhatsApp text bill as a chat-bubble-like card (kitchen name, phones, date,
   items with qty × rate = amount, total, advance paid, balance due, notes, "Thank you for ordering"),
   with "Send on WhatsApp" and "Copy" buttons.

9. **Menu**: items grouped by category with name, price/unit, min quantity, and an **available toggle**
   (seasonal items like "Gajar Halwa – Winter Special" can be hidden). Floating "Add item" button.
   "Share menu on WhatsApp" action at the top.

10. **Add / edit menu item**: name, category (choose existing or add new), unit (kg, pc, plate, bowl, roll,
    pizza as large chips), price per unit, minimum quantity, description, available toggle, delete.

11. **Dues: who owes money**: total outstanding at top in a large card; list of customers/orders with balance
    due, delivery date, and days overdue, sorted by oldest; "Remind on WhatsApp" and "Add payment" per row.

12. **Add payment sheet** (bottom sheet): amount (prefilled with balance), mode chips (Cash, UPI Papa,
    UPI Mummy), date, "This is a refund" toggle.

13. **Settings**: language switch (English / हिंदी as two big segmented buttons), log out, app version.

Also show: a loading state (skeleton cards), an offline/error state with a big "Retry" button, and one key
screen (Orders list) rendered **in Hindi** to prove the layout works with Devanagari.

Use realistic sample data: items like Khandvi ₹440/kg, Dal Kachori ₹20/pc, Veg Steam Momo ₹100/plate,
Paneer Butter Masala Thali ₹160/plate, Gajar Halwa ₹650/kg; Indian customer names; dates in November.
