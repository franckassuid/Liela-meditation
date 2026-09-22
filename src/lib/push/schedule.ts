export const REMINDER_DAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;
export interface ReminderSchedule { time: string; days: string[]; timeZone: string; }
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    if (formatters.size > 32) formatters.clear();
    formatters.set(timeZone, value);
  }
  return value;
}
function parts(date: Date, zone: string) {
  return Object.fromEntries(formatter(zone).formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
}
export function localDateKey(date: Date, zone: string) {
  const p = parts(date, zone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
export function validSchedule(value: ReminderSchedule) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) || !Array.isArray(value.days) || value.days.length > 7 || value.days.some(d => !(REMINDER_DAYS as readonly string[]).includes(d))) return false;
  try { formatter(value.timeZone); return true; } catch { return false; }
}
/** Find the next selected local day/time. Nonexistent spring DST times are skipped. */
export function nextReminderAt(value: ReminderSchedule, after: Date, excludeLocalDate?: string): Date | null {
  if (!validSchedule(value) || !value.days.length) return null;
  const today = parts(after, value.timeZone);
  const [hour, minute] = value.time.split(":").map(Number);
  for (let offset = 0; offset <= 8; offset++) {
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day + offset, hour, minute));
    if (!value.days.includes(REMINDER_DAYS[day.getUTCDay()])) continue;
    const desired = day.getTime();
    let candidate = desired;
    for (let attempt = 0; attempt < 4; attempt++) {
      const p = parts(new Date(candidate), value.timeZone);
      const rendered = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      const difference = desired - rendered;
      if (!difference) break;
      candidate += difference;
    }
    const result = new Date(candidate);
    const p = parts(result, value.timeZone);
    if (p.year !== day.getUTCFullYear() || p.month !== day.getUTCMonth() + 1 || p.day !== day.getUTCDate() || p.hour !== hour || p.minute !== minute) continue;
    if (result > after && localDateKey(result, value.timeZone) !== excludeLocalDate) return result;
  }
  return null;
}
