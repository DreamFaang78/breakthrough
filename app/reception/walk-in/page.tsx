import { WalkInForm } from "@/components/reception/walk-in-form";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ReceptionWalkInPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: departments }, { data: doctors }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("hospital_id", profile?.hospital_id)
      .eq("is_active", true),
    supabase
      .from("doctors")
      .select("id, name, department_id")
      .eq("hospital_id", profile?.hospital_id)
      .eq("is_active", true),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add Walk-in Patient</h1>
      <WalkInForm
        departments={departments ?? []}
        doctors={doctors ?? []}
        hospitalId={profile?.hospital_id ?? ""}
      />
    </div>
  );
}
