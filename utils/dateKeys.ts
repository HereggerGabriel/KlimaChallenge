// Calendar helpers that work in the device's local time zone.
// Never derive day/week keys from toISOString(): that is UTC, so in Austria
// (UTC+1/+2) the hours after midnight would still count as "yesterday".

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 local time of the week containing `d`. */
export function startOfWeek(d: Date = new Date()): Date {
  const monday = new Date(d);
  const day = monday.getDay(); // 0 = Sunday
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Local date key (YYYY-MM-DD) of the Monday starting the week containing `d`. */
export function weekStartKey(d: Date = new Date()): string {
  return localDateKey(startOfWeek(d));
}

/** True if `d` falls in the current Monday–Sunday week (local time). */
export function isInCurrentWeek(d: Date, now: Date = new Date()): boolean {
  const start = startOfWeek(now).getTime();
  // Step 7 calendar days rather than 7 * 24h so weeks with a DST switch stay exact.
  const end = new Date(startOfWeek(now));
  end.setDate(end.getDate() + 7);
  const t = d.getTime();
  return t >= start && t < end.getTime();
}

/** True if `a` and `b` are the same local calendar day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return localDateKey(a) === localDateKey(b);
}
