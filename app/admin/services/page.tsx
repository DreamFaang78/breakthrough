import { AdminServicesTable } from "@/components/admin/admin-services-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { AdminServiceRow, DepartmentOption } from "@/lib/types";

export default async function AdminServicesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: services }, { data: departments }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, price, department_id, is_active, departments(name)")
      .eq("hospital_id", profile?.hospital_id)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name")
      .eq("hospital_id", profile?.hospital_id)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
      <AdminServicesTable
        services={(services ?? []) as unknown as AdminServiceRow[]}
        departments={(departments ?? []) as DepartmentOption[]}
        hospitalId={profile?.hospital_id ?? ""}
      />
    </div>
  );
}
