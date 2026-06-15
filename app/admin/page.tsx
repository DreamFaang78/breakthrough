import { StatCard } from "@/components/common/stat-card";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ count: doctors }, { count: departments }, { count: appointments }, { count: leads }] =
    await Promise.all([
      supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", profile?.hospital_id),
      supabase
        .from("departments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", profile?.hospital_id),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", profile?.hospital_id),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", profile?.hospital_id),
    ]);

  const stats = [
    { label: "Doctors", value: doctors ?? 0 },
    { label: "Departments", value: departments ?? 0 },
    { label: "Appointments", value: appointments ?? 0 },
    { label: "Leads", value: leads ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {profile?.full_name}</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </div>
  );
}
