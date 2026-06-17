import { Building2 } from "lucide-react";
import { AdminProfileForm } from "@/components/admin/admin-profile-form";
import { PageHeader } from "@/components/common/page-header";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { AdminHospitalRow } from "@/lib/types";

export default async function AdminProfilePage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: hospital }, { data: setting }] = await Promise.all([
    supabase
      .from("hospitals")
      .select("id, name, slug, logo_url, address, city, phone, whatsapp, emergency_phone, google_maps_url, about, default_language, notification_email")
      .eq("id", profile?.hospital_id)
      .single(),
    supabase
      .from("settings")
      .select("value")
      .eq("hospital_id", profile?.hospital_id)
      .eq("key", "arrival_instruction")
      .maybeSingle(),
  ]);

  const arrivalInstruction = (setting?.value as { hi?: string; en?: string } | null) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Hospital Profile" description="Contact details, address, and patient instructions." icon={Building2} />
      <AdminProfileForm
        hospital={hospital as AdminHospitalRow}
        arrivalInstruction={{ hi: arrivalInstruction.hi ?? "", en: arrivalInstruction.en ?? "" }}
      />
    </div>
  );
}
