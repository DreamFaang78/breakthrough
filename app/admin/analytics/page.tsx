import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function AdminAnalyticsPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <AnalyticsDashboard hospitalId={profile?.hospital_id ?? ""} />
    </div>
  );
}
