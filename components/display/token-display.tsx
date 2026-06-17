"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ActiveAppointment {
  id: string;
  token_number: number | null;
  status: string;
  doctors: { name: string } | null;
  departments: { name: string } | null;
  patients: { name: string } | null;
}

interface Props {
  hospitalName: string;
  hospitalId: string;
  initial: ActiveAppointment[];
  today: string;
}

function formatTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function TokenDisplay({ hospitalName, hospitalId, initial, today }: Props) {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<ActiveAppointment[]>(initial);
  const [time, setTime] = useState(formatTime());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 10_000);
    return () => clearInterval(t);
  }, []);

  // Realtime: re-fetch when appointments change
  useEffect(() => {
    async function refetch() {
      const { data } = await supabase
        .from("appointments")
        .select("id, token_number, status, doctors(name), departments(name), patients(name)")
        .eq("hospital_id", hospitalId)
        .in("status", ["in_consultation", "arrived"])
        .eq("confirmed_date", today)
        .order("token_number", { ascending: true });
      if (data) setAppointments(data as unknown as ActiveAppointment[]);
    }

    const channel = supabase
      .channel(`display:${hospitalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `hospital_id=eq.${hospitalId}`,
        },
        () => { refetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hospitalId, today, supabase]);

  const consulting = appointments.filter((a) => a.status === "in_consultation");
  const waiting = appointments.filter((a) => a.status === "arrived");

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            {hospitalName}
          </p>
          <p className="text-sm font-medium text-white/60 mt-0.5">Token Display</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{time}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-0">
        {/* Now serving */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 border-b border-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">Now Serving</p>
          {consulting.length === 0 ? (
            <div className="text-center">
              <p className="text-8xl font-black text-white/10">—</p>
              <p className="mt-4 text-white/30 text-lg">No active consultation</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(consulting.length, 3)}, 1fr)` }}>
              {consulting.map((a) => (
                <div key={a.id} className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
                  <p className="text-[88px] font-black leading-none text-white tabular-nums">
                    #{a.token_number ?? "—"}
                  </p>
                  {a.doctors?.name && (
                    <p className="mt-4 text-lg font-semibold text-white/80">{a.doctors.name}</p>
                  )}
                  {a.departments?.name && (
                    <p className="mt-1 text-sm text-white/40">{a.departments.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting queue */}
        <div className="bg-white/3 px-8 py-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
            Waiting · {waiting.length} patients
          </p>
          {waiting.length === 0 ? (
            <p className="text-white/20 text-sm">No patients waiting</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {waiting.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center min-w-[96px]"
                >
                  <p className="text-3xl font-bold tabular-nums">#{a.token_number ?? "—"}</p>
                  {a.doctors?.name && (
                    <p className="mt-1 text-xs text-white/40 truncate max-w-[80px]">{a.doctors.name}</p>
                  )}
                </div>
              ))}
              {waiting.length > 10 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 flex items-center justify-center min-w-[96px]">
                  <p className="text-sm text-white/40">+{waiting.length - 10} more</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 flex items-center justify-between border-t border-white/10">
        <p className="text-xs text-white/20">Please wait for your token to be called</p>
        <p className="text-xs text-white/20">Kripya apna token number sunne ka intezaar karein</p>
      </div>
    </div>
  );
}
