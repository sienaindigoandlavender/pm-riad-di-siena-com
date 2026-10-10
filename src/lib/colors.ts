// A happy pastel-bright box of crayons. Each project wears one; white ticks stay legible on all.
export const PROJECT_COLORS = [
  "#E26D8E", // berry
  "#F2994A", // tangerine
  "#E0AE1F", // sunflower
  "#4CB59A", // mint
  "#5AA9E6", // sky
  "#9B7FD9", // lavender
  "#EF7B6C", // coral
  "#7DBB5A", // leaf
  "#3FA7A5", // teal
  "#D97BBF", // rose
] as const;

// Projects created with earlier palettes move to their cheerful twin.
const LEGACY: Record<string, string> = {
  // Apple
  "#007aff": "#5AA9E6",
  "#ff9500": "#F2994A",
  "#34c759": "#7DBB5A",
  "#af52de": "#9B7FD9",
  "#ff2d55": "#E26D8E",
  "#5ac8fa": "#3FA7A5",
  "#ff3b30": "#EF7B6C",
  "#5856d6": "#9B7FD9",
  "#ffcc00": "#E0AE1F",
  "#a2845e": "#F2994A",
  // earth
  "#5e7891": "#5AA9E6",
  "#7a9a7e": "#4CB59A",
  "#b5654a": "#EF7B6C",
  "#c29a4a": "#E0AE1F",
  "#8a6a88": "#9B7FD9",
  "#4f7c7a": "#3FA7A5",
  "#7f8452": "#7DBB5A",
  "#b07c7c": "#E26D8E",
  "#8c7b66": "#F2994A",
  "#6e7b8b": "#D97BBF",
};

/** A project's colour; older projects get their twin or a stable colour from their id. */
export function projectColor(p: { id: string; color: string } | undefined): string {
  if (!p) return "#4CB59A";
  const c = (p.color || "").toLowerCase();
  if (LEGACY[c]) return LEGACY[c];
  if (c && c !== "#111111") return p.color;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length]!;
}

export const SMART = {
  today: "#8E7CE0",
  upcoming: "#EF7B6C",
  inbox: "#4CB59A",
  flagged: "#E0AE1F",
  calendar: "#5AA9E6",
  gantt: "#D97BBF",
  ideas: "#3FA7A5",
  vision: "#E26D8E",
  notes: "#7DBB5A",
} as const;

export const FLAG_COLORS = ["", "#E0AE1F", "#F2994A", "#E26D8E"] as const;
