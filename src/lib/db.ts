import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** Server-side Supabase client (service role). Null when env vars are missing. */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export async function logEvent(
  type: string,
  task_id: string | null,
  data: Record<string, unknown> = {},
) {
  try {
    await db()?.from("pm_events").insert({ type, task_id, data });
  } catch {
    // history never blocks the work
  }
}
