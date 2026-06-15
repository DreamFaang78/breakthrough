import "server-only";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the current hospital (tenant) for the public website,
 * based on the `x-hospital-slug` header set by middleware.ts.
 */
export async function getCurrentHospital() {
  const headerList = await headers();
  const slug =
    headerList.get("x-hospital-slug") ??
    process.env.NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG ??
    "sharma-hospital";

  const supabase = await createClient();
  const { data } = await supabase
    .from("hospitals")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  return data;
}

/** Resolves a hospital by id — used by staff dashboards, which are scoped by the logged-in user's hospital_id rather than the URL. */
export async function getHospitalById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("hospitals").select("*").eq("id", id).single();
  return data;
}
