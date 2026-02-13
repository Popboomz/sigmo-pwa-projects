export const SYDNEY_TZ = "Australia/Sydney";

export function getDateKeySydney(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

export function daysBetweenSydney(startDateKey: string, todayKey: string): number {
  const start = new Date(`${startDateKey}T00:00:00Z`).getTime();
  const today = new Date(`${todayKey}T00:00:00Z`).getTime();
  const diff = today - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
