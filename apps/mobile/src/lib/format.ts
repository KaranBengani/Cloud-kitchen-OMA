import type { MenuUnit } from './types';

// ₹1,25,000 (Indian digit grouping), with paise only when there are any: ₹220, ₹13.20.
export function rupees(paise: number): string {
  const value = paise / 100;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

// 0.5 kg → "½ kg", 0.25 → "¼ kg", 1.5 → "1.5 kg", 20 pc → "20 pc".
export function quantity(qty: number, unit: MenuUnit): string {
  const fractions: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
  return `${fractions[String(qty)] ?? String(qty)} ${unit}`;
}

// What one tap of + / − changes for each unit: quarter kilos, whole pieces and plates.
export const stepFor = (unit: MenuUnit) => (unit === 'kg' ? 0.25 : 1);

// "12:30:00" or "12:30" → "12:30 PM". Postgres TIME comes back with seconds.
export function time12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "919811245890" → "+91 98112 45890"
export function phone(stored: string | null): string {
  if (!stored) return '';
  const d = stored.replace(/^91/, '');
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : stored;
}

// ---- Dates ----
// The API speaks 'YYYY-MM-DD' kitchen days. These helpers always parse them as local dates:
// new Date('2026-11-14') would be UTC midnight, which is the wrong day in some timezones.

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseISO(toIso).getTime() - parseISO(fromIso).getTime()) / 86_400_000);
}

// Monday of the week containing the date (Indian calendars start on Monday).
export function mondayOf(iso: string): string {
  const day = parseISO(iso).getDay(); // 0 = Sunday
  return addDays(iso, -((day + 6) % 7));
}

// 'Sat, 14 Nov' / 'शनि, 14 नव॰'
export function shortDate(iso: string, locale = 'en-IN'): string {
  return parseISO(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

// 'Saturday, 14 Nov 2026'
export function longDate(iso: string, locale = 'en-IN'): string {
  return parseISO(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

export function weekdayShort(iso: string, locale = 'en-IN'): string {
  return parseISO(iso).toLocaleDateString(locale, { weekday: 'short' });
}

export function monthTitle(iso: string, locale = 'en-IN'): string {
  return parseISO(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
