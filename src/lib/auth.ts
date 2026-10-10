/**
 * The garden gate. Edge-safe helpers shared by the middleware and the login route.
 *
 * - People sign in once with PM_PASSWORD and get a long-lived httpOnly cookie.
 * - Machines (Make, Claude) send `Authorization: Bearer <PM_API_TOKEN>` to /api/*.
 * - The cookie value is an HMAC of a fixed label with PM_SESSION_SECRET, so rotating
 *   the secret signs everyone out.
 */

export const SESSION_COOKIE = "pm_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // a year: sign in once per browser

const LABEL = "hudhud-session-v1";

export function gateConfigured(): boolean {
  return Boolean(process.env.PM_PASSWORD && process.env.PM_SESSION_SECRET);
}

export async function sessionValue(): Promise<string> {
  const secret = process.env.PM_SESSION_SECRET ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(LABEL));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (no early exit on the first differing character). */
export function sameText(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export function bearerOk(header: string | null): boolean {
  const token = process.env.PM_API_TOKEN;
  if (!token || !header?.startsWith("Bearer ")) return false;
  return sameText(header.slice(7).trim(), token);
}
