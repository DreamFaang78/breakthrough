"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Stethoscope, HeartPulse, Bone, Smile, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AdminDepartmentRow } from "@/lib/types";

interface Props {
  departments: AdminDepartmentRow[];
  hospitalId: string;
}

const ICON_OPTIONS: { value: string; label: string; icon: ReactNode }[] = [
  { value: "default", label: "General", icon: <Building2 className="size-4" /> },
  { value: "stethoscope", label: "Stethoscope", icon: <Stethoscope className="size-4" /> },
  { value: "heart-pulse", label: "Cardiology", icon: <HeartPulse className="size-4" /> },
  { value: "bone", label: "Orthopedics", icon: <Bone className="size-4" /> },
  { value: "tooth", label: "Dental", icon: <Smile className="size-4" /> },
];

const ICONS: Record<string, React.ReactNode> = Object.fromEntries(ICON_OPTIONS.map((o) => [o.value, o.icon]));

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

type FormState = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = { name: "", slug: "", icon: "default", description: "", is_active: true };

function DepartmentModal({
  initial,
  onClose,
  onSubmit,
  loading,
}: {
  initial: FormState;
  onClose: () => void;
  onSubmit: (data: FormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setError(null);
    onSubmit({ ...form, name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">{initial.name ? "Edit Department" : "Add Department"}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Icon</label>
            <select
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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

export function AdminDepartmentsTable({ departments, hospitalId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDepartmentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function addDepartment(data: FormState) {
    setSaving(true);
    const { error } = await supabase.from("departments").insert({
      hospital_id: hospitalId,
      name: data.name,
      slug: data.slug,
      icon: data.icon,
      description: data.description || null,
      is_active: data.is_active,
    });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Department added.");
    router.refresh();
    setSaving(false);
    setAddOpen(false);
  }

  async function updateDepartment(id: string, data: FormState) {
    setSaving(true);
    const { error } = await supabase
      .from("departments")
      .update({
        name: data.name,
        slug: data.slug,
        icon: data.icon,
        description: data.description || null,
        is_active: data.is_active,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Department updated.");
    router.refresh();
    setSaving(false);
    setEditing(null);
  }

  async function toggleActive(dept: AdminDepartmentRow) {
    setTogglingId(dept.id);
    const { error } = await supabase.from("departments").update({ is_active: !dept.is_active }).eq("id", dept.id);
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
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> Add Department
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No departments yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {ICONS[dept.icon ?? "default"] ?? ICONS.default}
                      </span>
                      <span className="font-medium">{dept.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{dept.slug}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{dept.description ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(dept)}
                      disabled={togglingId === dept.id}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        dept.is_active
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      )}
                    >
                      {dept.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(dept)}
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
        <DepartmentModal initial={EMPTY_FORM} loading={saving} onClose={() => setAddOpen(false)} onSubmit={addDepartment} />
      )}
      {editing && (
        <DepartmentModal
          initial={{
            name: editing.name,
            slug: editing.slug,
            icon: editing.icon ?? "default",
            description: editing.description ?? "",
            is_active: editing.is_active,
          }}
          loading={saving}
          onClose={() => setEditing(null)}
          onSubmit={(data) => updateDepartment(editing.id, data)}
        />
      )}
    </div>
  );
}
