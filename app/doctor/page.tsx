import { StatCard } from "@/components/common/stat-card";
import { DoctorQueue } from "@/components/doctor/doctor-queue";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { DoctorAppointment } from "@/lib/types";

export default async function DoctorDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [{ count: todaysCount }, { count: pendingCount }, { count: completedCount }, { data: appointments }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", profile?.doctor_id)
        .eq("confirmed_date", today),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", profile?.doctor_id)
        .eq("confirmed_date", today)
        .in("status", ["approved", "arrived"]),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", profile?.doctor_id)
        .eq("confirmed_date", today)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select(
          "id, status, preferred_date, preferred_slot, confirmed_date, confirmed_time, token_number, problem, doctor_notes, follow_up_date, patients(name, age, gender), departments(name)"
        )
        .eq("doctor_id", profile?.doctor_id)
        .not("status", "in", "(rejected,cancelled)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const stats = [
    { label: "Today's Appointments", value: todaysCount ?? 0 },
    { label: "Waiting", value: pendingCount ?? 0 },
    { label: "Completed", value: completedCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, Dr. {profile?.full_name}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      <DoctorQueue appointments={(appointments ?? []) as unknown as DoctorAppointment[]} today={today} tomorrow={tomorrow} />
    </div>
  );
}
