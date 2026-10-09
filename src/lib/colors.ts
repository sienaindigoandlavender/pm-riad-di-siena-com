// Apple system colours (light mode). Each project wears one.
export const PROJECT_COLORS = [
  "#007AFF", // blue
  "#FF9500", // orange
  "#34C759", // green
  "#AF52DE", // purple
  "#FF2D55", // pink
  "#5AC8FA", // teal
  "#FF3B30", // red
  "#5856D6", // indigo
  "#FFCC00", // yellow
  "#A2845E", // brown
] as const;

/** A project's colour; older projects without one get a stable colour from their id. */
export function projectColor(p: { id: string; color: string } | undefined): string {
  if (!p) return "#8E8E93";
  if (p.color && p.color.toLowerCase() !== "#111111") return p.color;
  let h = 0;
  for (const c of p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length]!;
}

export const SMART = {
  today: "#007AFF",
  upcoming: "#FF3B30",
  inbox: "#8E8E93",
  flagged: "#FF9500",
} as const;
