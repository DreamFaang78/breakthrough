import { CalendarDays, Hourglass, CheckCircle2 } from "lucide-react";
import { DashboardHero } from "@/components/common/dashboard-hero";
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

  const today_ = todaysCount ?? 0;
  const waiting = pendingCount ?? 0;
  const done = completedCount ?? 0;

  const stats = [
    { label: "Today's Appointments", value: today_, icon: CalendarDays, tone: "primary" as const },
    { label: "Waiting", value: waiting, icon: Hourglass, tone: "warning" as const },
    { label: "Completed", value: done, icon: CheckCircle2, tone: "success" as const },
  ];

  const summary =
    today_ === 0
      ? "No appointments scheduled for today."
      : `${today_} appointment${today_ === 1 ? "" : "s"} today · ${waiting} waiting · ${done} completed`;

  return (
    <div className="space-y-6">
      <DashboardHero prefix="Dr." name={profile?.full_name ?? ""} summary={summary} />
      <div className="stagger grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>
      <DoctorQueue appointments={(appointments ?? []) as unknown as DoctorAppointment[]} today={today} tomorrow={tomorrow} />
    </div>
  );
}
