"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { LeadRow } from "@/lib/types";

interface Props {
  leads: LeadRow[];
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

export function LeadsTable({ leads }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = leads;
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q));
    }
    return list;
  }, [leads, statusFilter, search]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update lead status");
    } else {
      toast.success("Lead status updated");
      router.refresh();
    }
    setUpdatingId(null);
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
    </div>
  );
}
