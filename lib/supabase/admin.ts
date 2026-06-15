import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Service-role client — server-only. Bypasses RLS.
 * Never import this from a Client Component or anything bundled to the browser.
 * Use only in Route Handlers / Server Actions / Edge Functions
 * (e.g. sending emails, super-admin tenant management, audit backfills).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
