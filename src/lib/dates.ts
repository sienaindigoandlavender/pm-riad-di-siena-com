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
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
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
