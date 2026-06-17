import { CalendarCheck, Hourglass, CalendarDays, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ReceptionBoard } from "@/components/reception/reception-board";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { ReceptionAppointment } from "@/lib/types";

export default async function AdminAppointmentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const hospitalId = profile?.hospital_id;

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: pending }, { count: todaysAppointments }, { count: total }, { data: appointments }, { data: doctors }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "pending"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("confirmed_date", today),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", hospitalId),
      supabase
        .from("appointments")
        .select(
          "id, status, type, source, is_walk_in, preferred_date, preferred_slot, confirmed_date, confirmed_time, token_number, problem, reject_reason, internal_notes, follow_up_date, created_at, patients(name, phone, age, gender), doctors(id, name), departments(id, name)"
        )
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("doctors")
        .select("id, name, department_id")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true),
    ]);

  const stats = [
    { label: "Pending Requests", value: pending ?? 0, icon: Hourglass, tone: "warning" as const },
    { label: "Today's Appointments", value: todaysAppointments ?? 0, icon: CalendarDays, tone: "primary" as const },
    { label: "Total Appointments", value: total ?? 0, icon: CalendarRange, tone: "success" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Review, approve, and manage every booking." icon={CalendarCheck} />
      <div className="stagger grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>
      <ReceptionBoard
        appointments={(appointments ?? []) as unknown as ReceptionAppointment[]}
        doctors={doctors ?? []}
        today={today}
      />
    </div>
  );
}
