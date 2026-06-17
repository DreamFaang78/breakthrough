import { CalendarDays, Hourglass, Users } from "lucide-react";
import { DashboardHero } from "@/components/common/dashboard-hero";
import { StatCard } from "@/components/common/stat-card";
import { ReceptionBoard } from "@/components/reception/reception-board";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { ReceptionAppointment } from "@/lib/types";

export default async function ReceptionDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const hospitalId = profile?.hospital_id;

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: pending }, { count: todaysAppointments }, { count: newLeads }, { data: rawAppointments }, { data: doctors }, { data: pendingNotifs }] =
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
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "new"),
      supabase
        .from("appointments")
        .select(
          "id, status, type, source, is_walk_in, preferred_date, preferred_slot, confirmed_date, confirmed_time, token_number, problem, reject_reason, internal_notes, follow_up_date, created_at, patients(name, phone, age, gender), doctors(id, name), departments(id, name)"
        )
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("doctors")
        .select("id, name, department_id")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true),
      supabase
        .from("notifications")
        .select("entity_id")
        .eq("hospital_id", hospitalId)
        .in("type", ["reschedule_request", "cancellation_request"])
        .eq("is_read", false),
    ]);

  const pendingRequestIds = new Set((pendingNotifs ?? []).map((n) => n.entity_id).filter(Boolean));

  const appointments = (rawAppointments ?? []).map((a) => ({
    ...a,
    has_pending_request: pendingRequestIds.has(a.id),
  }));

  const pendingCount = pending ?? 0;
  const todayCount = todaysAppointments ?? 0;
  const leadsCount = newLeads ?? 0;

  const stats = [
    { label: "Pending Requests", value: pendingCount, icon: Hourglass, tone: "warning" as const },
    { label: "Today's Appointments", value: todayCount, icon: CalendarDays, tone: "primary" as const },
    { label: "New Leads", value: leadsCount, icon: Users, tone: "success" as const },
  ];

  const summary =
    pendingCount === 0
      ? `${todayCount} appointment${todayCount === 1 ? "" : "s"} scheduled today.`
      : `${pendingCount} request${pendingCount === 1 ? "" : "s"} need attention · ${todayCount} today`;

  return (
    <div className="space-y-6">
      <DashboardHero name={profile?.full_name ?? ""} summary={summary} />
      <div className="stagger grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>
      <ReceptionBoard
        appointments={appointments as unknown as ReceptionAppointment[]}
        doctors={doctors ?? []}
        today={today}
      />
    </div>
  );
}
