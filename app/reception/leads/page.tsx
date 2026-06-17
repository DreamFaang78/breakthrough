import { Users } from "lucide-react";
import { AdminLeadsTable } from "@/components/admin/admin-leads-table";
import { PageHeader } from "@/components/common/page-header";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { DepartmentOption, DoctorOption, LeadRow } from "@/lib/types";

export default async function ReceptionLeadsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: leads }, { data: departments }, { data: doctors }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, name, phone, city_area, source, status, appointment_date, follow_up_date, notes, created_at, departments(name), doctors:doctor_preference(name)"
      )
      .eq("hospital_id", profile?.hospital_id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("departments")
      .select("id, name")
      .eq("hospital_id", profile?.hospital_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("doctors")
      .select("id, name, department_id")
      .eq("hospital_id", profile?.hospital_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Track enquiries and convert them into appointments." icon={Users} />
      <AdminLeadsTable
        leads={(leads ?? []) as unknown as LeadRow[]}
        departments={(departments ?? []) as DepartmentOption[]}
        doctors={(doctors ?? []) as DoctorOption[]}
        hospitalId={profile?.hospital_id ?? ""}
      />
    </div>
  );
}
