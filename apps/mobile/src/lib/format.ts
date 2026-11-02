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

// '2026-11-14' → 'Sat, 14 Nov'. Parsed as a local date on purpose: new Date('2026-11-14') would be UTC midnight.
export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Today in the phone's local time as 'YYYY-MM-DD'.
export function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
