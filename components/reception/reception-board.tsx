"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentStatus, ReceptionAppointment } from "@/lib/types";

type Doctor = { id: string; name: string; department_id: string | null };

interface Props {
  appointments: ReceptionAppointment[];
  doctors: Doctor[];
  today: string;
}

const STATUS_META: Record<AppointmentStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800 border-blue-200" },
  rescheduled: { label: "Rescheduled", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  arrived: { label: "Arrived", color: "bg-purple-100 text-purple-800 border-purple-200" },
  in_consultation: { label: "In Consultation", color: "bg-orange-100 text-orange-800 border-orange-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200" },
  no_show: { label: "Missed", color: "bg-red-50 text-red-600 border-red-100" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600 border-gray-200" },
  follow_up_required: { label: "Follow-up", color: "bg-teal-100 text-teal-800 border-teal-200" },
};

const REJECT_REASONS = ["Doctor unavailable", "Slot full", "Duplicate", "Other"];

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---- Generic modal shell ----
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSubmit,
  loading,
  disabled,
  label,
}: {
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || disabled}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : label}
      </button>
    </div>
  );
}

const fieldClass =
  "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

// ---- Approve & Assign modal ----
function AssignModal({
  appt,
  doctors,
  onClose,
  onSubmit,
  loading,
}: {
  appt: ReceptionAppointment;
  doctors: Doctor[];
  onClose: () => void;
  onSubmit: (values: { doctorId: string; date: string; time: string }) => void;
  loading: boolean;
}) {
  const [doctorId, setDoctorId] = useState(appt.doctors?.id ?? "");
  const [date, setDate] = useState(appt.confirmed_date ?? appt.preferred_date);
  const [time, setTime] = useState(appt.confirmed_time?.slice(0, 5) ?? "");

  const filteredDoctors = doctors.filter(
    (d) => !appt.departments?.id || d.department_id === appt.departments.id
  );

  return (
    <Modal title="Approve & Assign" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Doctor</label>
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={fieldClass}>
            <option value="">Any available doctor</option>
            {filteredDoctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Confirmed Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="text-sm font-medium">Confirmed Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
          </div>
        </div>
      </div>
      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ doctorId, date, time })}
        loading={loading}
        disabled={!date || !time}
        label="Approve"
      />
    </Modal>
  );
}

// ---- Reject modal ----
function RejectModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [custom, setCustom] = useState("");
  const finalReason = reason === "Other" ? custom : reason;

  return (
    <Modal title="Reject Request" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                reason === r ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {reason === "Other" && (
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Reason"
            className={fieldClass}
          />
        )}
      </div>
      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit(finalReason)}
        loading={loading}
        disabled={!finalReason}
        label="Reject"
      />
    </Modal>
  );
}

// ---- Reschedule modal ----
function RescheduleModal({
  appt,
  onClose,
  onSubmit,
  loading,
}: {
  appt: ReceptionAppointment;
  onClose: () => void;
  onSubmit: (values: { date: string; time: string }) => void;
  loading: boolean;
}) {
  const [date, setDate] = useState(appt.confirmed_date ?? appt.preferred_date);
  const [time, setTime] = useState(appt.confirmed_time?.slice(0, 5) ?? "");

  return (
    <Modal title="Propose New Slot" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">New Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium">New Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <ModalActions
        onClose={onClose}
        onSubmit={() => onSubmit({ date, time })}
        loading={loading}
        disabled={!date || !time}
        label="Send Reschedule"
      />
    </Modal>
  );
}

// ---- Follow-up modal ----
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
    <Modal title="Schedule Follow-up" onClose={onClose}>
      <div>
        <label className="text-sm font-medium">Follow-up Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </div>
      <ModalActions onClose={onClose} onSubmit={() => onSubmit(date)} loading={loading} disabled={!date} label="Save" />
    </Modal>
  );
}

type ModalType = "assign" | "reject" | "reschedule" | "followup";
type ModalState = { type: ModalType; appt: ReceptionAppointment } | null;

// ---- Appointment card ----
function AppointmentCard({
  appt,
  loading,
  onAction,
  onOpenModal,
}: {
  appt: ReceptionAppointment;
  loading: boolean;
  onAction: (status: AppointmentStatus) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const meta = STATUS_META[appt.status];
  const displayDate = appt.confirmed_date ?? appt.preferred_date;
  const displayTime = appt.confirmed_time ? formatTime(appt.confirmed_time) : appt.preferred_slot;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className={cn("flex items-center gap-2 border-b px-4 py-2.5", meta.color)}>
        <span className="text-sm font-semibold">{meta.label}</span>
        {appt.token_number && (
          <span className="ml-auto rounded-full bg-white/60 px-2.5 py-0.5 text-xs font-bold">
            Token #{appt.token_number}
          </span>
        )}
        {appt.is_walk_in && <span className="text-xs opacity-75">Walk-in</span>}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-semibold">{appt.patients?.name ?? "Unknown"}</p>
            <p className="text-sm text-muted-foreground">
              {appt.patients?.age ?? "?"} yrs · {appt.patients?.gender ?? "-"}
            </p>
          </div>
          {appt.patients?.phone && (
            <a
              href={`tel:${appt.patients.phone}`}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Phone className="size-3.5" /> {appt.patients.phone}
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="font-medium">{appt.departments?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Doctor</p>
            <p className="font-medium">{appt.doctors?.name ?? "Any available"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(displayDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-medium">{displayTime ?? "-"}</p>
          </div>
        </div>

        {appt.problem && (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{appt.problem}</p>
        )}

        {appt.status === "rejected" && appt.reject_reason && (
          <p className="text-sm text-destructive">Reason: {appt.reject_reason}</p>
        )}

        {appt.follow_up_date && (
          <p className="text-sm text-teal-700">Follow-up: {formatDate(appt.follow_up_date)}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {appt.status === "pending" && (
            <>
              <ActionButton loading={loading} onClick={() => onOpenModal("assign")}>Approve</ActionButton>
              <ActionButton loading={loading} onClick={() => onOpenModal("reschedule")} variant="outline">Reschedule</ActionButton>
              <ActionButton loading={loading} onClick={() => onOpenModal("reject")} variant="outline">Reject</ActionButton>
              <ActionButton loading={loading} onClick={() => onAction("cancelled")} variant="ghost">Cancel</ActionButton>
            </>
          )}
          {appt.status === "rescheduled" && (
            <>
              <ActionButton loading={loading} onClick={() => onOpenModal("assign")}>Approve</ActionButton>
              <ActionButton loading={loading} onClick={() => onOpenModal("reject")} variant="outline">Reject</ActionButton>
              <ActionButton loading={loading} onClick={() => onAction("cancelled")} variant="ghost">Cancel</ActionButton>
            </>
          )}
          {appt.status === "approved" && (
            <>
              <ActionButton loading={loading} onClick={() => onAction("arrived")}>Mark Arrived</ActionButton>
              <ActionButton loading={loading} onClick={() => onOpenModal("reschedule")} variant="outline">Reschedule</ActionButton>
              <ActionButton loading={loading} onClick={() => onAction("no_show")} variant="outline">No-show</ActionButton>
              <ActionButton loading={loading} onClick={() => onAction("cancelled")} variant="ghost">Cancel</ActionButton>
            </>
          )}
          {appt.status === "arrived" && (
            <>
              <ActionButton loading={loading} onClick={() => onAction("in_consultation")}>Start Consultation</ActionButton>
              <ActionButton loading={loading} onClick={() => onAction("no_show")} variant="outline">No-show</ActionButton>
              <ActionButton loading={loading} onClick={() => onAction("cancelled")} variant="ghost">Cancel</ActionButton>
            </>
          )}
          {appt.status === "in_consultation" && (
            <ActionButton loading={loading} onClick={() => onAction("completed")}>Mark Completed</ActionButton>
          )}
          {(appt.status === "completed" || appt.status === "no_show") && (
            <ActionButton loading={loading} onClick={() => onOpenModal("followup")} variant="outline">Set Follow-up</ActionButton>
          )}
        </div>
      </div>
    </div>
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
  variant?: "primary" | "outline" | "ghost";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" && "border hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

// ---- Main board ----
export function ReceptionBoard({ appointments, doctors, today }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"requests" | "today" | "all">("requests");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    let list = appointments;
    if (tab === "requests") {
      list = list.filter((a) => a.status === "pending" || a.status === "rescheduled");
    } else if (tab === "today") {
      list = list.filter((a) => (a.confirmed_date ?? a.preferred_date) === today);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) => a.patients?.name?.toLowerCase().includes(q) || a.patients?.phone?.includes(q)
      );
    }
    return list;
  }, [appointments, tab, search, today]);

  async function runAction(id: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setLoadingId(id);
    setError(null);
    const { error } = await fn();
    if (error) {
      setError(error.message);
      setLoadingId(null);
      return;
    }
    setModal(null);
    router.refresh();
    setLoadingId(null);
  }

  async function handleSimpleAction(appt: ReceptionAppointment, status: AppointmentStatus) {
    if ((status === "cancelled" || status === "no_show") && !window.confirm(`Mark this appointment as ${status.replace("_", " ")}?`)) {
      return;
    }
    if (status === "arrived") {
      setLoadingId(appt.id);
      setError(null);
      const { error } = await supabase.rpc("set_appointment_status", {
        p_appointment_id: appt.id,
        p_new_status: "arrived",
      });
      if (error) {
        setError(error.message);
        setLoadingId(null);
        return;
      }
      if (!appt.token_number) {
        await supabase.rpc("issue_token", { p_appointment_id: appt.id });
      }
      router.refresh();
      setLoadingId(null);
      return;
    }
    await runAction(appt.id, () =>
      supabase.rpc("set_appointment_status", { p_appointment_id: appt.id, p_new_status: status })
    );
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "requests", label: "Requests" },
    { key: "today", label: "Today" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
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

      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No appointments found.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              loading={loadingId === appt.id}
              onAction={(status) => handleSimpleAction(appt, status)}
              onOpenModal={(type) => setModal({ type, appt })}
            />
          ))}
        </div>
      )}

      {modal?.type === "assign" && (
        <AssignModal
          appt={modal.appt}
          doctors={doctors}
          onClose={() => setModal(null)}
          loading={loadingId === modal.appt.id}
          onSubmit={({ doctorId, date, time }) =>
            runAction(modal.appt.id, () =>
              supabase.rpc("assign_appointment", {
                p_appointment_id: modal.appt.id,
                p_doctor_id: doctorId || null,
                p_confirmed_date: date,
                p_confirmed_time: time,
              })
            )
          }
        />
      )}

      {modal?.type === "reject" && (
        <RejectModal
          onClose={() => setModal(null)}
          loading={loadingId === modal.appt.id}
          onSubmit={(reason) =>
            runAction(modal.appt.id, () =>
              supabase.rpc("set_appointment_status", {
                p_appointment_id: modal.appt.id,
                p_new_status: "rejected",
                p_meta: { reject_reason: reason },
              })
            )
          }
        />
      )}

      {modal?.type === "reschedule" && (
        <RescheduleModal
          appt={modal.appt}
          onClose={() => setModal(null)}
          loading={loadingId === modal.appt.id}
          onSubmit={({ date, time }) =>
            runAction(modal.appt.id, () =>
              supabase.rpc("set_appointment_status", {
                p_appointment_id: modal.appt.id,
                p_new_status: "rescheduled",
                p_meta: { confirmed_date: date, confirmed_time: time },
              })
            )
          }
        />
      )}

      {modal?.type === "followup" && (
        <FollowUpModal
          onClose={() => setModal(null)}
          loading={loadingId === modal.appt.id}
          onSubmit={(date) =>
            runAction(modal.appt.id, () =>
              supabase.rpc("set_appointment_status", {
                p_appointment_id: modal.appt.id,
                p_new_status: "follow_up_required",
                p_meta: { follow_up_date: date },
              })
            )
          }
        />
      )}
    </div>
  );
}
