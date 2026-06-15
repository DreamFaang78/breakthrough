import { AdminTimingsTable } from "@/components/admin/admin-timings-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { AdminDoctorTimingsRow } from "@/lib/types";

export default async function AdminTimingsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, name, qualification, opd_days, opd_timings, departments(name)")
    .eq("hospital_id", profile?.hospital_id)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">OPD Timings</h1>
      <p className="text-sm text-muted-foreground">
        Set which days each doctor is available and their consultation hours.
      </p>
      <AdminTimingsTable doctors={(doctors ?? []) as unknown as AdminDoctorTimingsRow[]} />
    </div>
  );
}
