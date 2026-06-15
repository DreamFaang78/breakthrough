import { AdminDepartmentsTable } from "@/components/admin/admin-departments-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { AdminDepartmentRow } from "@/lib/types";

export default async function AdminDepartmentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug, icon, description, is_active, created_at")
    .eq("hospital_id", profile?.hospital_id)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
      <AdminDepartmentsTable
        departments={(departments ?? []) as AdminDepartmentRow[]}
        hospitalId={profile?.hospital_id ?? ""}
      />
    </div>
  );
}
