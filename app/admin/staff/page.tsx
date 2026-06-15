import { AdminStaffTable } from "@/components/admin/admin-staff-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { AdminStaffRow, DepartmentOption } from "@/lib/types";

export default async function AdminStaffPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: staff }, { data: doctors }] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, role, doctor_id, is_active, doctors(name)")
      .eq("hospital_id", profile?.hospital_id)
      .in("role", ["receptionist", "doctor"])
      .order("full_name"),
    supabase
      .from("doctors")
      .select("id, name")
      .eq("hospital_id", profile?.hospital_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Staff Accounts</h1>
      <AdminStaffTable
        staff={(staff ?? []) as unknown as AdminStaffRow[]}
        doctors={(doctors ?? []) as DepartmentOption[]}
      />
    </div>
  );
}
