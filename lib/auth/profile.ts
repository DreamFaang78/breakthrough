import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns the logged-in staff member's profile (role, hospital_id, doctor_id),
 * or null if not authenticated. Used by protected layouts (/admin, /reception,
 * /doctor, /super) — route access is also enforced in middleware.ts.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  return profile;
}
