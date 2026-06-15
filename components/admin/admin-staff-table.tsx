"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AdminStaffRow, DepartmentOption } from "@/lib/types";

interface Props {
  staff: AdminStaffRow[];
  doctors: DepartmentOption[];
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

const ROLE_LABELS: Record<string, string> = {
  receptionist: "Receptionist",
  doctor: "Doctor",
  owner: "Owner",
};

type FormState = {
  full_name: string;
  email: string;
  password: string;
  role: "receptionist" | "doctor";
  doctor_id: string;
};

const EMPTY_FORM: FormState = { full_name: "", email: "", password: "", role: "receptionist", doctor_id: "" };

function AddStaffModal({
  doctors,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  doctors: DepartmentOption[];
  onClose: () => void;
  onSubmit: (data: FormState) => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setLocalError("Name, email and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (form.role === "doctor" && !form.doctor_id) {
      setLocalError("Select which doctor this account belongs to.");
      return;
    }
    setLocalError(null);
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Add Staff Account</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Full Name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as FormState["role"], doctor_id: "" }))}
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
          {form.role === "doctor" && (
            <div>
              <label className="block text-sm font-medium">Linked Doctor</label>
              <select
                value={form.doctor_id}
                onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                className={cn(fieldClass, "mt-1.5")}
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {(localError || error) && (
          <div className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {localError || error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
        <button onClick={onClose} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminStaffTable({ staff, doctors }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function addStaff(data: FormState) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: data.full_name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role,
        doctor_id: data.role === "doctor" ? data.doctor_id : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create account.");
      setSaving(false);
      return;
    }
    toast.success("Staff account created.");
    router.refresh();
    setSaving(false);
    setAddOpen(false);
  }

  async function toggleActive(member: AdminStaffRow) {
    setTogglingId(member.id);
    const { error } = await supabase.from("users").update({ is_active: !member.is_active }).eq("id", member.id);
    if (error) {
      toast.error(error.message);
    }
    router.refresh();
    setTogglingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setError(null);
            setAddOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> Add Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No staff accounts yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Linked Doctor</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[member.role] ?? member.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{member.doctors?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(member)}
                      disabled={togglingId === member.id}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        member.is_active
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      )}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <AddStaffModal
          doctors={doctors}
          loading={saving}
          error={error}
          onClose={() => setAddOpen(false)}
          onSubmit={addStaff}
        />
      )}
    </div>
  );
}
