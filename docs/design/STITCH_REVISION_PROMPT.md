# Stitch revision prompt (round 2)

Paste everything below the line into the same Stitch project. Export every screen again as PNG (2x), full height,
including bottom sheets with their buttons visible, into `docs/design/`.

---

Revise all screens of "Mummy's Kitchen" with the changes below. Keep the current visual style: rust red primary
buttons, mustard yellow highlights, dark brown text, warm cream background, serif headings, Noto Sans body,
rounded cards, large touch targets. Use realistic Indian sample data with **consistent numbers** (totals must add up).
The son's name is **Karan** (not Aman). Dates are **November 2026**.

## Global changes (apply to every screen)
1. **Header:** remove the "Kitchen Open" status and the profile avatar. Each screen has a plain title only
   (e.g. "Orders", "Menu", "Dues"); detail screens get a back arrow + title.
2. **Remove** all dish photos, all "Veg" badges, and all customer tags ("Regular", "Tiffin user", "Office Group",
   "Family Gathering"), and item tags like "Winter Special".
3. **One language at a time.** Do not show English and Hindi side by side. Design every screen in English, and
   additionally render **Orders list** and **New order step 3** fully in Hindi (Devanagari) as separate frames.
4. **Keep** the bottom tab bar exactly as now: Orders, Menu, raised round **New Order** button in the centre, Dues
   (with a count badge), Settings. Bottom sheets and full screens must not be covered by the tab bar.
5. Order statuses are only: **Booked, Ready, Delivered, Cancelled**. No "Preparing", "Packing", "Dispatch".
6. Payment modes are only: **Cash, UPI Papa, UPI Mummy**. No GPay/PhonePe badges, no UPI IDs shown.
7. No delivery charges anywhere (customers pay the courier directly). No printer, no kitchen ticket, no QR codes,
   no PDF, no stock quantities, no offline mode.

## Screen-by-screen changes

**1. PIN login**: remove the tagline pill, the "Kitchen staff login (…)" line, the small Hindi numerals under
keypad digits and the headset key (leave that keypad cell empty). Bottom text (not a button): "Forgot PIN? Ask Karan".
Keep logo, title, 6 dots, error banner, round keypad.

**2. Orders: upcoming list**: keep the current tall order card layout. Changes: status chip uses Booked / Ready /
Delivered / Cancelled; the line under the customer name shows the **delivery address for Parcel** orders (blank for
Pickup); remove the "6 Total Orders" button and the "Active Kitchen" pill. Add a **cancelled order card** (greyed out,
name struck through, "Cancelled" chip). Each day header shows the day's order count and total (e.g. "Today • 13 Nov
· 4 orders · ₹2,510"). Keep week strip, Week/Month toggle, empty-day state.

**3. Orders: month calendar**: remove the legend. Days with no orders show just the date (no "0" pill). The
selected day's orders below use the **same card as screen 2**. Keep the day total and "Add order for Nov 13".

**4. New order step 1: customer**: new layout: search box at top; the **first row is "+ New customer"**; below it,
recent customers. Each customer row: name, phone, address (one line), and a red "₹150 due" chip if they owe money.
**Tapping a customer goes straight to step 2** (no Select + Continue). Show a second frame of the "New customer" form
opened as a full screen: Name, Phone (+91 prefix), Address, and one "Save & continue" button.
Step indicator: three numbered circles with short labels "Customer · Items · Review" that fit without truncation.

**5. New order step 2: items**: no photos. Items **not yet added** are a single compact row: name, short
description, "₹440 / kg", and a "+ Add" button. Items **already added** expand to show the quantity stepper, and for
kg items the chips ¼ kg, ½ kg, 1 kg, 2 kg, plus the subtotal. Show the soft "Minimum ½ kg" warning only on an item
whose quantity is below its minimum. Add a **"+ Custom item"** row at the top of the list that opens a small sheet:
name, unit (kg / pc / plate / bowl / roll / pizza chips), price per unit, quantity, "Add". Keep search, category
chips (All, Namkeen, Snacks & Chaats, Thali & Combos, Dessert) and the sticky bottom bar (item count, total, "Next").

**6. New order step 3: review**:
- Customer card with "Change" link and an **editable delivery address**.
- Items list: each line shows qty, name, unit price and line total. **Tapping a unit price edits it**: show the
  original price struck through, the new price, and a small "edited" tag. Custom items show a small "custom" tag.
- Below the items: Items subtotal, an optional **"Discount" line** (tap to enter ₹ amount; shown in green as
  "− ₹85"), and **Final total**. No delivery charge.
- **Notes**: quick chips "Less spicy", "Less oil", "No onion-garlic", "Extra chutney", "Separate boxes" (tapping
  adds the phrase to the notes box) and a multi-line notes box.
- **Delivery**: a **date picker field** (e.g. "Sat, 14 Nov 2026") and a **time field** (with quick chips 12:30 PM,
  4:30 PM, 7:30 PM and "Other time"), shown once only. Pickup / Parcel toggle.
- **Advance (optional)**: amount box (empty means no advance) + mode chips Cash / UPI Papa / UPI Mummy. Show
  "Balance due ₹950" below. Remove the Advance / Full / Pay-on-delivery radio options and the "Pending" mode.
- Big "Save order" button. Remove the WhatsApp checkbox and the "Token … kitchen ticket printed" text.

**7. Order detail**: rebuild with this order, top to bottom:
1. Back arrow, "Order #21", status chip.
2. Delivery date and time, Pickup/Parcel, address.
3. **One big next-step button**: "Mark ready" (when Booked), "Mark delivered" (when Ready); hidden when
   Delivered or Cancelled.
4. Customer: name, phone, Call and WhatsApp buttons.
5. Notes in the highlighted red "instructions" box.
6. Items: qty, name, unit price, line total (edited price and custom tags as on Review), subtotal, discount, total.
7. **Payments**: list of payments (date, mode, amount; refunds shown as negative in red), "Paid ₹500",
   **"Balance due ₹950"** large, and a **"+ Add payment"** button.
8. Bottom action bar: green **"Send bill"** (WhatsApp), **"Edit"**, and a "⋯" menu containing "Cancel order".
Remove: kitchen progression bar, "Ready in 35m", cook's checklist checkboxes, cook assigned, ticket time, Map,
print, "Mark settled".
Also show, as a separate frame, a **dialog**: "Someone else changed this order. Reload to see their changes."
with a "Reload" button.

**8. WhatsApp bill**: keep only: the WhatsApp-style message preview (kitchen name, phone numbers, order #, date and
time, items as "qty × rate = amount", subtotal, discount, total, advance paid, balance due, notes, "Thank you for
ordering"), a big green "Send on WhatsApp" button and a "Copy" button **below** the preview (not floating over it).
No UPI line, no QR, no PDF, no image card, no bill settings, no delivery charge.

**9. Menu**: remove the kitchen open/close card, lunch window, stats tiles, "Thali of the Day", stock levels
("Sold out", "Low stock", "1.5 kg remaining", "Restock all", "Back in stock") and prep-notice notes. Keep search and
category chips. Each item row: name, "₹440 / kg · min ½ kg", an edit pencil, and an **"Available" switch**
(unavailable items greyed). Add **"Share menu on WhatsApp"** at the top and a floating "+ Add item" button.

**10. Add / edit item**: a **full screen** (not a sheet) with a fixed "Save" button at the bottom. Fields: Name,
Category (chips of existing categories + "+ New"), Unit (large chips: kg, pc, plate, bowl, roll, pizza), Price per
unit (₹), Minimum quantity, Description (one line, e.g. "6 pcs/plate"), Available switch, and a red "Delete item" text
button at the end. Remove photo, Pure Veg, Jain toggle and Menu ID. Show the whole screen.

**11. Dues**: keep the total pending card, filters (All, Upcoming, Overdue) and per-order cards (name, order #,
delivery date, items summary, total, paid, balance, "Overdue by N days" warning, Call, Remind on WhatsApp, Collect).
Sort oldest first. Remove "Remind All", the Kitchen UPI QR card and customer tags. Add a small **"To refund"**
section at the bottom for a cancelled order where an advance was paid (e.g. "Ankit Jain · #19 · cancelled ·
refund ₹300").

**12. Record payment (bottom sheet)**: keep the pending summary, amount box and a "Full due (₹1,035)" chip. Remove
the ₹500 / ₹1,000 chips, "Auto-Matched", GPay/PhonePe badges and UPI IDs. Payment mode as three large options: Cash,
UPI Papa, UPI Mummy. Add a **date** field (default today), a **"This is a refund"** switch, and a visible
"Save payment" button. Show the full sheet without anything cut off.

**13. Settings**: only: language (English / हिंदी as two big buttons), "Check for update", "Log out", and the app
version at the bottom. Remove everything else (kitchen profile, open toggle, auto bill, chime, currency, sync
status, offline, printer, backup, app lock).

**Also design these states** (in the same style):
- Loading: Orders list with skeleton cards.
- No internet: a full-screen message "No internet connection" with a big "Retry" button.
- Empty Dues: "No pending dues 🎉".
- Empty search on New order step 2: "No items found" with "+ Custom item".
