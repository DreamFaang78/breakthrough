"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Search, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DepartmentOption, DoctorOption, LeadRow } from "@/lib/types";

interface Props {
  leads: LeadRow[];
  departments: DepartmentOption[];
  doctors: DoctorOption[];
  hospitalId: string;
}

const LEAD_STATUSES = [
  "new",
  "contacted",
  "appointment_booked",
  "visited",
  "follow_up_required",
  "converted",
  "not_interested",
  "lost",
] as const;

const CLOSED_STATUSES = new Set(["converted", "not_interested", "lost"]);

const LEAD_SOURCES = [
  "website",
  "phone_call",
  "whatsapp",
  "google_maps",
  "instagram",
  "facebook",
  "walk_in",
  "referral",
  "other",
] as const;

const MANUAL_SOURCES = LEAD_SOURCES.filter((s) => s !== "website" && s !== "walk_in");

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  appointment_booked: "bg-indigo-100 text-indigo-800 border-indigo-200",
  visited: "bg-green-100 text-green-800 border-green-200",
  follow_up_required: "bg-teal-100 text-teal-800 border-teal-200",
  converted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  not_interested: "bg-gray-100 text-gray-600 border-gray-200",
  lost: "bg-red-50 text-red-600 border-red-100",
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

function AddLeadModal({
  departments,
  doctors,
  onClose,
  onSubmit,
  loading,
}: {
  departments: DepartmentOption[];
  doctors: DoctorOption[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    phone: string;
    city_area: string;
    department_id: string;
    doctor_preference: string;
    source: string;
    notes: string;
  }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityArea, setCityArea] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [doctorPreference, setDoctorPreference] = useState("");
  const [source, setSource] = useState<string>(MANUAL_SOURCES[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const doctorOptions = departmentId ? doctors.filter((d) => d.department_id === departmentId) : doctors;

  function handleSubmit() {
    if (!name.trim() || phone.replace(/\D/g, "").length !== 10) {
      setError("Name and a valid 10-digit phone number are required.");
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      phone: phone.replace(/\D/g, ""),
      city_area: cityArea.trim(),
      department_id: departmentId,
      doctor_preference: doctorPreference,
      source,
      notes: notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Add Lead</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={cn(fieldClass, "mt-1.5")} />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">City / Area (optional)</label>
            <input value={cityArea} onChange={(e) => setCityArea(e.target.value)} className={cn(fieldClass, "mt-1.5")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Department</label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setDoctorPreference("");
                }}
                className={cn(fieldClass, "mt-1.5")}
              >
                <option value="">No preference</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <select
                value={doctorPreference}
                onChange={(e) => setDoctorPreference(e.target.value)}
                className={cn(fieldClass, "mt-1.5")}
              >
                <option value="">No preference</option>
                {doctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={cn(fieldClass, "mt-1.5")}>
              {MANUAL_SOURCES.map((s) => (
                <option key={s} value={s}>{formatLabel(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(fieldClass, "mt-1.5 resize-none")}
            />
          </div>
        </div>

        {error && <div className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Saving..." : "Add Lead"}
        </button>
        <button onClick={onClose} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminLeadsTable({ leads, departments, doctors, hospitalId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const followUpCount = useMemo(
    () => leads.filter((l) => l.follow_up_date && l.follow_up_date <= today && !CLOSED_STATUSES.has(l.status)).length,
    [leads, today]
  );

  const filtered = useMemo(() => {
    let list = leads;
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    if (sourceFilter !== "all") {
      list = list.filter((l) => l.source === sourceFilter);
    }
    if (departmentFilter !== "all") {
      list = list.filter((l) => l.departments?.name === departmentFilter);
    }
    if (followUpOnly) {
      list = list.filter((l) => l.follow_up_date && l.follow_up_date <= today && !CLOSED_STATUSES.has(l.status));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q));
    }
    return list;
  }, [leads, statusFilter, sourceFilter, departmentFilter, followUpOnly, search, today]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await supabase.from("leads").update({ status }).eq("id", id);
    router.refresh();
    setUpdatingId(null);
  }

  async function addLead(data: {
    name: string;
    phone: string;
    city_area: string;
    department_id: string;
    doctor_preference: string;
    source: string;
    notes: string;
  }) {
    setAdding(true);
    await supabase.from("leads").insert({
      hospital_id: hospitalId,
      name: data.name,
      phone: data.phone,
      city_area: data.city_area || null,
      department_id: data.department_id || null,
      doctor_preference: data.doctor_preference || null,
      source: data.source,
      status: "new",
      notes: data.notes || null,
    });
    router.refresh();
    setAdding(false);
    setAddOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === "all" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === s ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {formatLabel(s)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> Add Lead
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFollowUpOnly((v) => !v)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            followUpOnly ? "border-teal-300 bg-teal-100 text-teal-800" : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
          )}
        >
          Follow-ups Due ({followUpCount})
        </button>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-xl border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        >
          <option value="all">All Sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>{formatLabel(s)}</option>
          ))}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-xl border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone"
            className="w-64 rounded-xl border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No leads found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Doctor Pref.</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.name}</p>
                    {lead.city_area && <p className="text-xs text-muted-foreground">{lead.city_area}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Phone className="size-3.5" /> {lead.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatLabel(lead.source)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.departments?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.doctors?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(lead.follow_up_date)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      disabled={updatingId === lead.id}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        STATUS_COLORS[lead.status]
                      )}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{formatLabel(s)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <AddLeadModal
          departments={departments}
          doctors={doctors}
          loading={adding}
          onClose={() => setAddOpen(false)}
          onSubmit={addLead}
        />
      )}
    </div>
  );
}
