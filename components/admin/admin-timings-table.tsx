"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AdminDoctorTimingsRow } from "@/lib/types";

interface Props {
  doctors: AdminDoctorTimingsRow[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_TIMING = { start: "10:00", end: "14:00" };

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const fieldClass =
  "rounded-xl border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

type Timings = Record<string, { start: string; end: string }>;

function TimingsModal({
  doctor,
  onClose,
  onSubmit,
  loading,
}: {
  doctor: AdminDoctorTimingsRow;
  onClose: () => void;
  onSubmit: (days: string[], timings: Timings) => void;
  loading: boolean;
}) {
  const [days, setDays] = useState<string[]>(doctor.opd_days ?? []);
  const [timings, setTimings] = useState<Timings>(doctor.opd_timings ?? {});

  function toggleDay(day: string) {
    if (days.includes(day)) {
      setDays(days.filter((d) => d !== day));
    } else {
      setDays([...days, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)));
      if (!timings[day]) {
        setTimings((t) => ({ ...t, [day]: DEFAULT_TIMING }));
      }
    }
  }

  function setTime(day: string, field: "start" | "end", value: string) {
    setTimings((t) => ({ ...t, [day]: { ...(t[day] ?? DEFAULT_TIMING), [field]: value } }));
  }

  function handleSubmit() {
    const cleanTimings: Timings = {};
    for (const day of days) {
      cleanTimings[day] = timings[day] ?? DEFAULT_TIMING;
    }
    onSubmit(days, cleanTimings);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold">OPD Timings — {doctor.name}</h3>
        <div className="mt-4 space-y-2.5">
          {DAYS.map((day) => {
            const active = days.includes(day);
            return (
              <div key={day} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "w-14 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                    active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {day}
                </button>
                {active ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={timings[day]?.start ?? DEFAULT_TIMING.start}
                      onChange={(e) => setTime(day, "start", e.target.value)}
                      className={fieldClass}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={timings[day]?.end ?? DEFAULT_TIMING.end}
                      onChange={(e) => setTime(day, "end", e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not available</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminTimingsTable({ doctors }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState<AdminDoctorTimingsRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveTimings(id: string, days: string[], timings: Timings) {
    setSaving(true);
    const { error } = await supabase.from("doctors").update({ opd_days: days, opd_timings: timings }).eq("id", id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Timings updated.");
    router.refresh();
    setSaving(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      {doctors.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No doctors yet. Add doctors first from the Doctors page.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">OPD Days</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{doc.name}</p>
                    {doc.qualification && <p className="text-xs text-muted-foreground">{doc.qualification}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.departments?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.opd_days?.length ? doc.opd_days.join(", ") : "Not set"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(doc)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TimingsModal
          doctor={editing}
          loading={saving}
          onClose={() => setEditing(null)}
          onSubmit={(days, timings) => saveTimings(editing.id, days, timings)}
        />
      )}
    </div>
  );
}
