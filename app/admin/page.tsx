import { Stethoscope, LayoutGrid, CalendarCheck, Users } from "lucide-react";
import { DashboardHero } from "@/components/common/dashboard-hero";
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
    { label: "Doctors", value: doctors ?? 0, icon: Stethoscope, tone: "primary" as const },
    { label: "Departments", value: departments ?? 0, icon: LayoutGrid, tone: "default" as const },
    { label: "Appointments", value: appointments ?? 0, icon: CalendarCheck, tone: "success" as const },
    { label: "Leads", value: leads ?? 0, icon: Users, tone: "warning" as const },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero name={profile?.full_name ?? ""} />
      <div className="stagger grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>
    </div>
  );
}
