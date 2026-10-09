// The people tasks can be given to. "jackie" is Jacqueline herself (shown as "Me").
export const TEAM = [
  { id: "jackie", name: "Me", full: "Jackie", color: "#9B7FD9" },
  { id: "zahra", name: "Zahra", full: "Zahra", color: "#E26D8E" },
  { id: "mouad", name: "Mouad", full: "Mouad", color: "#3FA7A5" },
] as const;

export type PersonId = (typeof TEAM)[number]["id"];
export const PEOPLE_IDS: readonly string[] = TEAM.map((p) => p.id);

export function person(id: string | null | undefined) {
  return TEAM.find((p) => p.id === id) ?? TEAM[0];
}

/** Null means Jacqueline. */
export const isMine = (assignee: string | null) => !assignee || assignee === "jackie";
