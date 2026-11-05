import { todayIST } from '../common/today.js';
import type { KitchenHoliday } from '../holidays/kitchen-holiday.entity.js';
import type { MenuItem } from './menu-item.entity.js';

// The public web menu (DECISIONS.md D17): the Canva card as one HTML page, built from the live menu.
// Rendered on the server so it needs no JavaScript and WhatsApp's link preview can read the <meta> tags.
// Fonts and colours are the ones the Canva PDF uses (Berkshire Swash, Lato); images are cut from it.

export type MenuPageItem = Pick<MenuItem, 'name' | 'category' | 'unit' | 'pricePaise' | 'minQty' | 'description'>;
export type MenuPageHoliday = Pick<KitchenHoliday, 'startDate' | 'endDate' | 'note'>;

// As printed on the Canva menu. The first number gets the "Order on WhatsApp" button.
const PHONES = ['+91 9830460199', '+91 9123086730'];
const ORDER_TEXT = "Hi, I'd like to order from Mummy's Kitchen";
// Images are cached for a day; bump this when one changes so phones fetch the new file.
const IMAGE_VERSION = 2;

const UNIT_WORDS: Record<string, [string, string]> = {
  pc: ['piece', 'pieces'],
  plate: ['plate', 'plates'],
  bowl: ['bowl', 'bowls'],
  roll: ['roll', 'rolls'],
  pizza: ['pizza', 'pizzas'],
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// 40000 → "400", 1250 → "12.50". The card shows bare rupees, without ₹.
export function menuPrice(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

// Wording from the Canva card: "1/2 kg", "250 Gms", "10 pieces", and "4 units" when units are mixed.
export function minLabel(min: number, units: string[]): string {
  if (units.every((u) => u === 'kg')) {
    if (min === 0.5) return '1/2 kg';
    return min < 1 ? `${Math.round(min * 1000)} Gms` : `${min} kg`;
  }
  const words = units.every((u) => u === units[0]) ? UNIT_WORDS[units[0]] : undefined;
  return `${min} ${words ? words[min === 1 ? 0 : 1] : 'units'}`;
}

// '2026-11-10' → 'Tue, 10 Nov'. Parsed as UTC and formatted in UTC, so the server's timezone can't shift the day.
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

// "Kitchen closed Tue, 10 Nov – Thu, 12 Nov · Diwali". Holidays more than 60 days away aren't shown yet.
export function holidayLines(holidays: MenuPageHoliday[], today: string): string[] {
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 60);
  const limit = horizon.toISOString().slice(0, 10);
  return holidays
    .filter((h) => h.startDate <= limit)
    .slice(0, 3)
    .map((h) => {
      const from = h.startDate < today ? today : h.startDate;
      const when =
        from === today && h.endDate === today
          ? 'today'
          : from === h.endDate
            ? dayLabel(from)
            : `${from === today ? 'today' : dayLabel(from)} – ${dayLabel(h.endDate)}`;
      return `Kitchen closed ${when}${h.note ? ` · ${h.note}` : ''}`;
    });
}

type Run = { min: number | null; items: MenuPageItem[] };
type Section = { category: string; runs: Run[] };

// Categories in menu order; inside each, neighbouring items with the same minimum share one red
// "Minimum Quantity" heading, like the card. kg and countable items never share one.
export function groupMenu(items: MenuPageItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    let section = sections.find((s) => s.category === item.category);
    if (!section) sections.push((section = { category: item.category, runs: [] }));
    const last = section.runs.at(-1);
    const sameMin =
      last &&
      last.min === item.minQty &&
      (last.min === null || (last.items[0].unit === 'kg') === (item.unit === 'kg'));
    if (sameMin) last.items.push(item);
    else section.runs.push({ min: item.minQty, items: [item] });
  }
  return sections;
}

function renderSection({ category, runs }: Section): string {
  const body = runs
    .map(({ min, items }) => {
      const heading =
        min === null ? '' : `<div class="min">Minimum Quantity ${minLabel(min, items.map((i) => i.unit))}</div>`;
      const rows = items
        .map(
          (i) =>
            `<div class="item"><span class="name">${escapeHtml(i.name)}</span>` +
            `<span class="price">${menuPrice(i.pricePaise)}/ ${escapeHtml(i.unit)}</span>` +
            (i.description ? `<span class="note">(${escapeHtml(i.description)})</span>` : '') +
            `</div>`,
        )
        .join('');
      return heading + rows;
    })
    .join('');
  return `<section class="cat"><h2>${escapeHtml(category)}</h2>${body}</section>`;
}

// `origin` (e.g. https://oma-api-exso.onrender.com) makes the preview image URL absolute, which WhatsApp needs.
export function renderMenuPage(
  items: MenuPageItem[],
  origin: string,
  holidays: MenuPageHoliday[] = [],
  today = todayIST(),
): string {
  const sections = groupMenu(items).map(renderSection).join('\n');
  const closed = holidayLines(holidays, today)
    .map((line) => `<p class="closed">${escapeHtml(line)}</p>`)
    .join('');
  const orderUrl = `https://wa.me/${PHONES[0].replace(/\D/g, '')}?text=${encodeURIComponent(ORDER_TEXT)}`;
  const description = 'Homemade namkeen, snacks & chaats, thalis and desserts. Order on WhatsApp.';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mummy's Kitchen · Menu</title>
<meta name="description" content="${description}">
<meta property="og:title" content="Mummy's Kitchen · Menu">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${origin}/menu/cover.jpg?v=${IMAGE_VERSION}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#F4CB61">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Berkshire+Swash&family=Lato:wght@700;900&display=swap">
<style>${STYLES}</style>
</head>
<body>
<div class="page">
  <img class="cover" alt="Mummy's Kitchen" src="/menu/cover.jpg?v=${IMAGE_VERSION}" width="900" height="1273">
  <img class="banner" alt="" src="/menu/banner.jpg?v=${IMAGE_VERSION}" width="1200" height="448">
  <p class="bulk">For bulk orders place order 3 days in advance</p>
  ${closed}
  <main class="menu">
${sections}
  </main>
</div>
<footer>
  <div class="brand"><b>MUMMY’S</b><span>KITCHEN</span></div>
  <div class="contact">
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${PHONE_ICON}"/></svg>
    <div class="phones">${PHONES.map((p) => `<a href="tel:${p.replace(/\s/g, '')}">${p}</a>`).join('<br>')}</div>
    <small>*Both numbers are reachable via WhatsApp as well</small>
  </div>
</footer>
<a class="order" href="${orderUrl}">
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${WHATSAPP_ICON}"/></svg>
  Order on WhatsApp
</a>
</body>
</html>`;
}

const STYLES = `
  :root {
    --paper: #EFDEC7; --ink: #573312; --pill: #F4CB61; --min: #FF3131; --whatsapp: #1FA855;
    --script: 'Berkshire Swash', Georgia, serif;
    --sans: 'Lato', 'Helvetica Neue', Arial, sans-serif;
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--script); }
  img { max-width: 100%; }
  .page { max-width: 920px; margin: 0 auto; }
  .cover, .banner { display: block; width: 100%; height: auto; }
  .bulk { text-align: center; font-size: clamp(1.05rem, 4.4vw, 1.5rem); margin: 0.2em 16px 0; text-wrap: balance; }
  .closed {
    margin: 12px 16px 0; padding: 10px 16px; border-radius: 8px; text-align: center;
    background: var(--min); color: #fff; font-family: var(--sans); font-weight: 900; font-size: 1.05rem;
  }
  .menu { padding: 8px 16px 32px; display: grid; gap: 28px; }
  @media (min-width: 760px) {
    .menu { grid-template-columns: 1fr 1fr; column-gap: 48px; padding-inline: 40px; align-items: start; }
  }
  .cat h2 {
    display: inline-block; margin: 0 0 10px; padding: 6px 18px; background: var(--pill); border-radius: 8px;
    font-weight: 400; font-size: clamp(1.5rem, 6.4vw, 1.9rem); line-height: 1.25;
  }
  .min { color: var(--min); font-size: 1rem; margin: 14px 0 4px; }
  .item { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 14px; align-items: baseline; padding: 5px 0; }
  .name, .price { font-size: clamp(1.15rem, 5vw, 1.35rem); line-height: 1.3; }
  .price { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .note { grid-column: 1 / -1; font-size: 0.95rem; line-height: 1.2; }
  footer {
    background: var(--pill); padding: 22px 16px calc(96px + env(safe-area-inset-bottom, 0px));
    display: flex; flex-wrap: wrap; gap: 16px 40px; justify-content: space-between; align-items: center;
  }
  @media (min-width: 760px) { footer { padding-inline: 72px; } }
  .brand { font-family: var(--sans); font-weight: 900; line-height: 1; }
  .brand b { display: block; font-size: 2.6rem; }
  .brand span { display: inline-block; font-size: 1.35rem; margin-top: 6px; padding-bottom: 8px; border-bottom: 3px solid var(--ink); }
  .contact { font-family: var(--sans); font-weight: 700; display: grid; grid-template-columns: auto auto; column-gap: 12px; align-items: start; }
  .contact svg { margin-top: 4px; }
  .phones { font-size: 1.1rem; line-height: 1.15; }
  .phones a { color: inherit; text-decoration: none; }
  .contact small { grid-column: 2; font-size: 0.8rem; max-width: 22ch; margin-top: 6px; }
  .order {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    display: flex; align-items: center; gap: 10px; padding: 14px 26px; border-radius: 999px; text-decoration: none;
    background: var(--whatsapp); color: #fff; font-family: var(--sans); font-weight: 900; font-size: 1.1rem;
    box-shadow: 0 6px 18px rgba(60, 30, 5, 0.3); white-space: nowrap;
  }
  .order:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
`;

const PHONE_ICON =
  'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z';
const WHATSAPP_ICON =
  'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.3-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.42l-.76-1.83c-.2-.48-.4-.41-.56-.42h-.47a.9.9 0 0 0-.65.3 2.7 2.7 0 0 0-.85 2.02 4.7 4.7 0 0 0 .99 2.5 10.8 10.8 0 0 0 4.14 3.66c1.55.67 2.15.72 2.92.6.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z';
