/** Compare local calendar dates, including across daylight-saving changes. */
export function formatHistoryDate(isoString: string, now = new Date()): string {
  const date = new Date(isoString);
  const calendarDay = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const daysAgo = (calendarDay(now) - calendarDay(date)) / 86_400_000;

  if (daysAgo === 0) return "aujourd'hui";
  if (daysAgo === 1) return "hier";
  if (daysAgo > 1 && daysAgo < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "long" });
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
