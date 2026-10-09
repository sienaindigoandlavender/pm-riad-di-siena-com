const TZ = "Africa/Casablanca";

/** Today's date (YYYY-MM-DD) in Marrakech. */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Written out by hand so the server and the browser always print the same thing.
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parts(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return { day: d.getUTCDate(), weekday: DAYS[d.getUTCDay()]!, month: MONTHS[d.getUTCMonth()]! };
}

/** "Friday 9 October" */
export function longDate(iso: string): string {
  const p = parts(iso);
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "Today", "Tomorrow", "Yesterday", "Mon 12 Oct" */
export function shortDate(iso: string, ref = today()): string {
  if (iso === ref) return "Today";
  if (iso === addDays(ref, 1)) return "Tomorrow";
  if (iso === addDays(ref, -1)) return "Yesterday";
  const p = parts(iso);
  return `${p.weekday.slice(0, 3)} ${p.day} ${p.month.slice(0, 3)}`;
}

/** The hour (0–23) in Marrakech. */
export function marrakechHour(now = new Date()): number {
  const iso = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(iso);
}

/** "19:03" in Marrakech. */
export function marrakechTime(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000,
  );
}

/** "October 2026" for "2026-10" */
export function monthTitle(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m! - 1]} ${y}`;
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
