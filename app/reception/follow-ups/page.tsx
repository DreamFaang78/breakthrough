import { PhoneCall } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { FollowUpList } from "@/components/reception/follow-up-list";
import { PageHeader } from "@/components/common/page-header";
import type { LeadRow } from "@/lib/types";

export default async function FollowUpsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const hospitalId = profile?.hospital_id;

  const today = new Date().toISOString().slice(0, 10);

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone, city_area, source, status, follow_up_date, notes, created_at, departments(name), doctors(name)")
    .eq("hospital_id", hospitalId)
    .lte("follow_up_date", today)
    .not("status", "in", "(converted,lost,not_interested)")
    .order("follow_up_date", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-up Call List"
        description="Leads due for follow-up today or earlier — aaj call karni hai"
        icon={PhoneCall}
      />
      <FollowUpList leads={(leads ?? []) as unknown as LeadRow[]} today={today} />
    </div>
  );
}
