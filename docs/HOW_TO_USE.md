# Mummy's Kitchen: how to use

Short guide for installing the app and the everyday tasks. The family PIN is shared in person, never written here.

## Install (once per phone)
1. Open the APK link Karan sends on the phone (WhatsApp is fine) and tap **Download**.
2. Open the downloaded file. Android asks to allow installing from this source: tap **Settings**, turn on
   **Allow from this source**, go back, tap **Install**.
3. Open **Mummy's Kitchen** and enter the 6-digit family PIN. It stays logged in for about 6 months.
4. Hindi: **Settings** tab → **हिंदी**. Each phone remembers its own language.

The grey **Mummy's Kitchen (Test)** app is only for Karan's testing. Real orders always go in the coloured app.

## Every day
| To do this | Tap |
|---|---|
| See upcoming orders | **Orders** tab. Tap a day at the top to jump to it; **Month** shows the calendar. |
| Take an order | The big **+** in the middle → pick or add the customer → add items → check everything → **Save order** |
| Something not on the menu | In the items step, **+ Custom item** (name, unit, price, quantity) |
| Give a special price | In the last step, tap the item's price and type the new one |
| Give a discount | In the last step, **+ Add discount** |
| Order is ready / delivered | Open the order → big button at the top |
| Send the bill | Open the order → **Send bill** → **Send on WhatsApp** |
| Money received | Open the order → **+ Add payment**, or the **Dues** tab → **Record pay** |
| Remind someone who owes money | **Dues** tab → **Remind** (opens their WhatsApp chat with a polite message) |
| Change a price or hide a seasonal item | **Menu** tab → pencil to edit, switch to hide or show |
| Cancel an order | Open the order → **⋯** → **Cancel order**. Payments stay recorded; a refund shows under **Dues → To refund**. |

## If something looks wrong
- **"Someone else changed this order"**: another phone saved first. Tap **Reload** and make the change again.
- **"No internet"**: check Wi-Fi or mobile data, then tap **Retry**.
- **The first screen takes up to a minute late at night or early morning**: the server was asleep; it wakes up by itself.
- **Karan says there's a fix**: **Settings** → **Check for update**. The app restarts with the fix; nothing to reinstall.
- **Forgot the PIN**: ask Karan.

## For Karan: releasing a change
1. Open the feature PR against **`staging`** and merge it there. The staging API (`oma-api-stg`) deploys from
   `staging`; database migrations run on start against the Neon `staging` branch.
2. Publish the app to the Test app from the `staging` branch: `npm run update:staging -w mobile -- --message "..."`
3. Check it in **Mummy's Kitchen (Test)** (Settings → Check for update).
4. Open a PR from `staging` into **`main`** and merge it: the production API (`oma-api`) deploys.
5. Publish the same app change to production from `main`: `npm run update:production -w mobile -- --message "..."`

Always use these scripts. They pass `--environment`, so the update gets that environment's API URL from EAS; a bare
`eas update` would bake in the laptop's `.env` URL and point the phones at nothing.

A change that adds a native module or a plugin in `app.json` needs a new APK and a reinstall, not an update.
