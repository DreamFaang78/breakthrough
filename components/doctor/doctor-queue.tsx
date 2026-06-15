"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentStatus, DoctorAppointment } from "@/lib/types";

interface Props {
  appointments: DoctorAppointment[];
  today: string;
  tomorrow: string;
}

const STATUS_META: Record<AppointmentStatus, { label: string; color: string }> = {
  pending: { label: "Pending Approval", color: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800 border-blue-200" },
  rescheduled: { label: "Rescheduled", color: "bg-purple-100 text-purple-800 border-purple-200" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-600 border-red-100" },
  arrived: { label: "Arrived", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  in_consultation: { label: "In Consultation", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200" },
  no_show: { label: "No Show", color: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500 border-gray-200" },
  follow_up_required: { label: "Follow-up Required", color: "bg-teal-100 text-teal-800 border-teal-200" },
};

type Tab = "today" | "tomorrow" | "pending" | "arrived" | "completed";

const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "pending", label: "Pending" },
  { key: "arrived", label: "Arrived" },
  { key: "completed", label: "Completed" },
];

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-4">{children}</div>
        <button onClick={onClose} className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

function CompleteModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (notes: string) => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Mark as Completed" onClose={onClose}>
      <label className="block text-sm font-medium">Consultation notes (optional)</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Diagnosis, prescription, advice..."
        className={cn(fieldClass, "mt-1.5 resize-none")}
      />
      <button
        onClick={() => onSubmit(notes)}
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Saving..." : "Mark Completed"}
      </button>
    </Modal>
  );
}

function FollowUpModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (date: string) => void;
  loading: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <Modal title="Request Follow-up" onClose={onClose}>
      <label className="block text-sm font-medium">Follow-up date</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(fieldClass, "mt-1.5")} />
      <button
        onClick={() => onSubmit(date)}
        disabled={loading || !date}
        className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Saving..." : "Request Follow-up"}
      </button>
    </Modal>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  variant?: "primary" | "outline";
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
        variant === "primary" ? "bg-primary text-primary-foreground hover:opacity-90" : "border hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  );
}

function AppointmentCard({
  appt,
  loading,
  onAction,
  onOpenModal,
}: {
  appt: DoctorAppointment;
  loading: boolean;
  onAction: (status: AppointmentStatus) => void;
  onOpenModal: (type: "complete" | "followup") => void;
}) {
  const meta = STATUS_META[appt.status];
  const time = formatTime(appt.confirmed_time ?? appt.preferred_slot);

  return (
    <div className={cn("rounded-2xl border bg-card p-4", appt.status === "arrived" && "border-emerald-300 bg-emerald-50/40")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{appt.patients?.name ?? "Unknown patient"}</p>
          <p className="text-xs text-muted-foreground">
            {appt.patients?.age ? `${appt.patients.age} yrs` : ""}
            {appt.patients?.age && appt.patients?.gender ? " · " : ""}
            {appt.patients?.gender ?? ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {appt.token_number != null && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">#{appt.token_number}</span>
          )}
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", meta.color)}>{meta.label}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {appt.departments?.name && <span>{appt.departments.name}</span>}
        {appt.confirmed_date && <span>{formatDate(appt.confirmed_date)}</span>}
        {time && <span>{time}</span>}
      </div>

      {appt.problem && <p className="mt-2 text-sm text-foreground/90">{appt.problem}</p>}
      {appt.doctor_notes && (
        <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Notes: </span>
          {appt.doctor_notes}
        </p>
      )}
      {appt.follow_up_date && (
        <p className="mt-2 text-xs text-teal-700">Follow-up: {formatDate(appt.follow_up_date)}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {appt.status === "arrived" && (
          <>
            <ActionButton onClick={() => onAction("in_consultation")} loading={loading}>
              Start Consultation
            </ActionButton>
            <ActionButton onClick={() => onAction("no_show")} loading={loading} variant="outline">
              No-show
            </ActionButton>
          </>
        )}
        {appt.status === "in_consultation" && (
          <ActionButton onClick={() => onOpenModal("complete")} loading={loading}>
            Mark Completed
          </ActionButton>
        )}
        {(appt.status === "completed" || appt.status === "no_show") && !appt.follow_up_date && (
          <ActionButton onClick={() => onOpenModal("followup")} loading={loading} variant="outline">
            Request Follow-up
          </ActionButton>
        )}
      </div>
    </div>
  );
}

export function DoctorQueue({ appointments, today, tomorrow }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("today");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: "complete" | "followup"; appt: DoctorAppointment } | null>(null);

  const filtered = useMemo(() => {
    switch (tab) {
      case "today":
        return appointments
          .filter((a) => a.confirmed_date === today)
          .sort((a, b) => (a.token_number ?? 9999) - (b.token_number ?? 9999));
      case "tomorrow":
        return appointments
          .filter((a) => a.confirmed_date === tomorrow)
          .sort((a, b) => (a.token_number ?? 9999) - (b.token_number ?? 9999));
      case "pending":
        return appointments.filter((a) => a.status === "pending");
      case "arrived":
        return appointments.filter((a) => a.status === "arrived");
      case "completed":
        return appointments.filter((a) => a.status === "completed" || a.status === "no_show");
    }
  }, [appointments, tab, today, tomorrow]);

  async function runUpdate(id: string, status: AppointmentStatus, meta?: Record<string, string>) {
    setLoadingId(id);
    setError(null);
    const { error } = await supabase.rpc("set_appointment_status", {
      p_appointment_id: id,
      p_new_status: status,
      p_meta: meta ?? {},
    });
    if (error) {
      setError(error.message);
      setLoadingId(null);
      return;
    }
    setModal(null);
    router.refresh();
    setLoadingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No appointments here.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              loading={loadingId === appt.id}
              onAction={(status) => runUpdate(appt.id, status)}
              onOpenModal={(type) => setModal({ type, appt })}
            />
          ))}
        </div>
      )}

      {modal?.type === "complete" && (
        <CompleteModal
          onClose={() => setModal(null)}
          loading={loadingId === modal.appt.id}
          onSubmit={(notes) => runUpdate(modal.appt.id, "completed", notes ? { doctor_notes: notes } : undefined)}
        />
      )}
      {modal?.type === "followup" && (
        <FollowUpModal
          onClose={() => setModal(null)}
          loading={loadingId === modal.appt.id}
          onSubmit={(date) => runUpdate(modal.appt.id, "follow_up_required", { follow_up_date: date })}
        />
      )}
    </div>
  );
}
