"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AdminServiceRow, DepartmentOption } from "@/lib/types";

interface Props {
  services: AdminServiceRow[];
  departments: DepartmentOption[];
  hospitalId: string;
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

type FormState = {
  name: string;
  description: string;
  price: string;
  department_id: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = { name: "", description: "", price: "", department_id: "", is_active: true };

function ServiceModal({
  initial,
  departments,
  onClose,
  onSubmit,
  loading,
}: {
  initial: FormState;
  departments: DepartmentOption[];
  onClose: () => void;
  onSubmit: (data: FormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.price && Number.isNaN(Number(form.price))) {
      setError("Price must be a number.");
      return;
    }
    setError(null);
    onSubmit({ ...form, name: form.name.trim(), description: form.description.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">{initial.name ? "Edit Service" : "Add Service"}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Department (optional)</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Price (optional)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className={cn(fieldClass, "mt-1.5 resize-none")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="size-4 rounded border"
            />
            Active (visible on website)
          </label>
        </div>

        {error && <div className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
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

export function AdminServicesTable({ services, departments, hospitalId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminServiceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function toPayload(data: FormState) {
    return {
      name: data.name,
      description: data.description || null,
      price: data.price ? Number(data.price) : null,
      department_id: data.department_id || null,
      is_active: data.is_active,
    };
  }

  async function addService(data: FormState) {
    setSaving(true);
    await supabase.from("services").insert({ hospital_id: hospitalId, ...toPayload(data) });
    router.refresh();
    setSaving(false);
    setAddOpen(false);
  }

  async function updateService(id: string, data: FormState) {
    setSaving(true);
    await supabase.from("services").update(toPayload(data)).eq("id", id);
    router.refresh();
    setSaving(false);
    setEditing(null);
  }

  async function toggleActive(svc: AdminServiceRow) {
    setTogglingId(svc.id);
    await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id);
    router.refresh();
    setTogglingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No services yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{svc.name}</p>
                    {svc.description && <p className="text-xs text-muted-foreground">{svc.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{svc.departments?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{svc.price ? `₹${svc.price}` : "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(svc)}
                      disabled={togglingId === svc.id}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        svc.is_active
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      )}
                    >
                      {svc.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(svc)}
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

      {addOpen && (
        <ServiceModal
          initial={EMPTY_FORM}
          departments={departments}
          loading={saving}
          onClose={() => setAddOpen(false)}
          onSubmit={addService}
        />
      )}
      {editing && (
        <ServiceModal
          initial={{
            name: editing.name,
            description: editing.description ?? "",
            price: editing.price != null ? String(editing.price) : "",
            department_id: editing.department_id ?? "",
            is_active: editing.is_active,
          }}
          departments={departments}
          loading={saving}
          onClose={() => setEditing(null)}
          onSubmit={(data) => updateService(editing.id, data)}
        />
      )}
    </div>
  );
}
