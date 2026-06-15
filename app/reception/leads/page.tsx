import { LeadsTable } from "@/components/reception/leads-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/types";

export default async function ReceptionLeadsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, name, phone, city_area, source, status, appointment_date, follow_up_date, notes, created_at, departments(name), doctors:doctor_preference(name)"
    )
    .eq("hospital_id", profile?.hospital_id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
      <LeadsTable leads={(leads ?? []) as unknown as LeadRow[]} />
    </div>
  );
}
