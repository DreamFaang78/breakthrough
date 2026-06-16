"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/common/stat-card";

interface Props {
  hospitalId: string;
}

type RangeKey = "today" | "week" | "month" | "custom";

type Overview = {
  total_requests: number;
  approved: number;
  completed: number;
  rejected: number;
  no_show: number;
  walk_in: number;
  online: number;
  conversion_rate: number;
  follow_ups_pending: number;
  lost_leads: number;
};

type DoctorRow = { doctor_id: string; doctor_name: string; total: number };
type DepartmentRow = { department_id: string; department_name: string; total: number };
type SourceRow = { source: string; total: number };
type DayRow = { day: string; total: number };

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#6366f1", "#84cc16"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function getRangeDates(range: RangeKey, customFrom: string, customTo: string) {
  const today = new Date();
  const todayStr = toDateStr(today);

  if (range === "today") return { from: todayStr, to: todayStr };

  if (range === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { from: toDateStr(start), to: todayStr };
  }

  if (range === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toDateStr(start), to: todayStr };
  }

  return { from: customFrom, to: customTo };
}

function GrowthBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", positive ? "text-emerald-600" : "text-red-600")}>
        {positive ? "+" : ""}{value.toFixed(1)}%
      </p>
    </div>
  );
}

export function AnalyticsDashboard({ hospitalId }: Props) {
  const supabase = createClient();
  const [range, setRange] = useState<RangeKey>("month");
  const today = toDateStr(new Date());
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [byDoctor, setByDoctor] = useState<DoctorRow[]>([]);
  const [byDepartment, setByDepartment] = useState<DepartmentRow[]>([]);
  const [bySource, setBySource] = useState<SourceRow[]>([]);
  const [timeseries, setTimeseries] = useState<DayRow[]>([]);

  useEffect(() => {
    if (!hospitalId) return;
    let active = true;

    async function fetchAll() {
      setLoading(true);
      const { from, to } = getRangeDates(range, customFrom, customTo);

      const tsTo = new Date();
      const tsFrom = new Date();
      tsFrom.setDate(tsTo.getDate() - 59);

      const [ov, doc, dep, src, ts] = await Promise.all([
        supabase.rpc("analytics_overview", { p_hospital_id: hospitalId, p_from: from, p_to: to }),
        supabase.rpc("analytics_by_doctor", { p_hospital_id: hospitalId, p_from: from, p_to: to }),
        supabase.rpc("analytics_by_department", { p_hospital_id: hospitalId, p_from: from, p_to: to }),
        supabase.rpc("analytics_by_source", { p_hospital_id: hospitalId, p_from: from, p_to: to }),
        supabase.rpc("analytics_timeseries", { p_hospital_id: hospitalId, p_from: toDateStr(tsFrom), p_to: toDateStr(tsTo) }),
      ]);

      if (!active) return;

      setOverview((ov.data as Overview) ?? null);
      setByDoctor(((doc.data as DoctorRow[]) ?? []).filter((d) => d.total > 0).slice(0, 8));
      setByDepartment(((dep.data as DepartmentRow[]) ?? []).filter((d) => d.total > 0));
      setBySource(((src.data as SourceRow[]) ?? []).filter((s) => s.total > 0));
      setTimeseries((ts.data as DayRow[]) ?? []);
      setLoading(false);
    }

    fetchAll();
    return () => {
      active = false;
    };
  }, [hospitalId, range, customFrom, customTo, supabase]);

  const last30 = timeseries.slice(-30);
  const last7 = timeseries.slice(-7);
  const prev7 = timeseries.slice(-14, -7);
  const last30Sum = timeseries.slice(-30).reduce((s, d) => s + d.total, 0);
  const prev30Sum = timeseries.slice(-60, -30).reduce((s, d) => s + d.total, 0);
  const last7Sum = last7.reduce((s, d) => s + d.total, 0);
  const prev7Sum = prev7.reduce((s, d) => s + d.total, 0);

  const weeklyGrowth = timeseries.length >= 14 ? (prev7Sum === 0 ? (last7Sum > 0 ? 100 : 0) : ((last7Sum - prev7Sum) / prev7Sum) * 100) : null;
  const monthlyGrowth = timeseries.length >= 60 ? (prev30Sum === 0 ? (last30Sum > 0 ? 100 : 0) : ((last30Sum - prev30Sum) / prev30Sum) * 100) : null;

  const topDepartment = byDepartment[0];
  const topDoctor = byDoctor[0];

  const cards = overview
    ? [
        { label: "Total Requests", value: overview.total_requests },
        { label: "Approved", value: overview.approved },
        { label: "Completed", value: overview.completed },
        { label: "Rejected", value: overview.rejected },
        { label: "No-shows", value: overview.no_show },
        { label: "Walk-ins", value: overview.walk_in },
        { label: "Online Requests", value: overview.online },
        { label: "Follow-ups Pending", value: overview.follow_ups_pending },
        { label: "Conversion Rate", value: `${overview.conversion_rate}%` },
        { label: "Lost Leads", value: overview.lost_leads },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
          {(["today", "week", "month", "custom"] as RangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                range === key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {key === "today" ? "Today" : key === "week" ? "Last 7 Days" : key === "month" ? "This Month" : "Custom"}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Loading analytics...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {cards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} />
            ))}
          </div>

          {(overview?.lost_leads ?? 0) > 0 && (
            <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 flex items-center gap-4">
              <div className="shrink-0 size-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">₹</div>
              <div>
                <p className="text-sm font-medium text-orange-800">Estimated Lost Revenue</p>
                <p className="text-2xl font-bold text-orange-700">₹{((overview?.lost_leads ?? 0) * 400).toLocaleString("en-IN")}</p>
                <p className="text-xs text-orange-600 mt-0.5">{overview?.lost_leads} lost leads × ₹400 avg ticket — reduce rejections to recover this</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Most Demanded Department</p>
              <p className="mt-1 text-xl font-semibold">{topDepartment?.department_name ?? "-"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Most Booked Doctor</p>
              <p className="mt-1 text-xl font-semibold">{topDoctor?.doctor_name ?? "-"}</p>
            </div>
            <GrowthBadge label="Weekly Growth" value={weeklyGrowth} />
            <GrowthBadge label="Monthly Growth" value={monthlyGrowth} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Doctor-wise Appointments</h3>
              {byDoctor.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byDoctor}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="doctor_name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Department-wise Appointments</h3>
              {byDepartment.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="department_name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Lead Sources</h3>
              {bySource.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={bySource}
                      dataKey="total"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => formatLabel(String((entry as unknown as SourceRow).source))}
                    >
                      {bySource.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, formatLabel(String(name))]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Daily Appointments (Last 30 Days)</h3>
              {last30.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={last30}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} interval={4} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(d) => formatShortDate(d as string)} />
                    <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
