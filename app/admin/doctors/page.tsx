import { AdminDoctorsTable } from "@/components/admin/admin-doctors-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { AdminDoctorRow, DepartmentOption } from "@/lib/types";

export default async function AdminDoctorsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: doctors }, { data: departments }] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, name, slug, qualification, department_id, photo_url, bio, consultation_fee, is_active, departments(name)")
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
      <h1 className="text-2xl font-semibold tracking-tight">Doctors</h1>
      <AdminDoctorsTable
        doctors={(doctors ?? []) as unknown as AdminDoctorRow[]}
        departments={(departments ?? []) as DepartmentOption[]}
        hospitalId={profile?.hospital_id ?? ""}
      />
    </div>
  );
}
