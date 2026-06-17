import { BarChart3 } from "lucide-react";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { PageHeader } from "@/components/common/page-header";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function AdminAnalyticsPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Appointments, leads, and conversion trends at a glance." icon={BarChart3} />
      <AnalyticsDashboard hospitalId={profile?.hospital_id ?? ""} />
    </div>
  );
}
