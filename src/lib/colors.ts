// Earth colours, Sunsama-soft. Each project wears one; white text and ticks stay legible on all.
export const PROJECT_COLORS = [
  "#5E7891", // slate
  "#7A9A7E", // sage
  "#B5654A", // clay
  "#C29A4A", // ochre
  "#8A6A88", // plum
  "#4F7C7A", // teal earth
  "#7F8452", // olive
  "#B07C7C", // dusty rose
  "#8C7B66", // walnut
  "#6E7B8B", // stone blue
] as const;

// Projects created with the earlier Apple palette move to their earth twin.
const LEGACY: Record<string, string> = {
  "#007aff": "#5E7891",
  "#ff9500": "#C29A4A",
  "#34c759": "#7A9A7E",
  "#af52de": "#8A6A88",
  "#ff2d55": "#B07C7C",
  "#5ac8fa": "#4F7C7A",
  "#ff3b30": "#B5654A",
  "#5856d6": "#6E7B8B",
  "#ffcc00": "#C29A4A",
  "#a2845e": "#8C7B66",
};

/** A project's colour; older projects get their earth twin or a stable colour from their id. */
export function projectColor(p: { id: string; color: string } | undefined): string {
  if (!p) return "#8C8478";
  const c = (p.color || "").toLowerCase();
  if (LEGACY[c]) return LEGACY[c];
  if (c && c !== "#111111") return p.color;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length]!;
}

export const SMART = {
  today: "#4A6B85",
  upcoming: "#B5654A",
  inbox: "#8C8478",
  flagged: "#B8914A",
} as const;

export const FLAG_COLORS = ["", "#CDB27A", "#C29A4A", "#B5533C"] as const;
