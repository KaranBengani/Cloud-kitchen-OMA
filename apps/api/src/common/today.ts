// The kitchen runs on Indian time. The server (Render) runs on UTC, where it's still
// "yesterday" until 05:30 IST, so never use new Date().toISOString().slice(0, 10) for "today".
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}
