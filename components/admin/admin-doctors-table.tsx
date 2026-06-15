"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AdminDoctorRow, DepartmentOption } from "@/lib/types";

interface Props {
  doctors: AdminDoctorRow[];
  departments: DepartmentOption[];
  hospitalId: string;
}

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
  qualification: string;
  department_id: string;
  photo_url: string;
  bio: string;
  consultation_fee: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  qualification: "",
  department_id: "",
  photo_url: "",
  bio: "",
  consultation_fee: "",
  is_active: true,
};

function DoctorModal({
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
    if (form.consultation_fee && Number.isNaN(Number(form.consultation_fee))) {
      setError("Consultation fee must be a number.");
      return;
    }
    setError(null);
    onSubmit({
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      qualification: form.qualification.trim(),
      photo_url: form.photo_url.trim(),
      bio: form.bio.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold">{initial.name ? "Edit Doctor" : "Add Doctor"}</h3>
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
            <label className="block text-sm font-medium">Qualification (optional)</label>
            <input
              value={form.qualification}
              onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
              placeholder="e.g. MBBS, MD"
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Department</label>
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
            <label className="block text-sm font-medium">Photo URL (optional)</label>
            <input
              value={form.photo_url}
              onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
              placeholder="https://..."
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Consultation Fee (optional)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.consultation_fee}
              onChange={(e) => setForm((f) => ({ ...f, consultation_fee: e.target.value }))}
              className={cn(fieldClass, "mt-1.5")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Bio (optional)</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
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

export function AdminDoctorsTable({ doctors, departments, hospitalId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDoctorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function toPayload(data: FormState) {
    return {
      name: data.name,
      slug: data.slug,
      qualification: data.qualification || null,
      department_id: data.department_id || null,
      photo_url: data.photo_url || null,
      bio: data.bio || null,
      consultation_fee: data.consultation_fee ? Number(data.consultation_fee) : null,
      is_active: data.is_active,
    };
  }

  async function addDoctor(data: FormState) {
    setSaving(true);
    const { error } = await supabase.from("doctors").insert({ hospital_id: hospitalId, ...toPayload(data) });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Doctor added.");
    router.refresh();
    setSaving(false);
    setAddOpen(false);
  }

  async function updateDoctor(id: string, data: FormState) {
    setSaving(true);
    const { error } = await supabase.from("doctors").update(toPayload(data)).eq("id", id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Doctor updated.");
    router.refresh();
    setSaving(false);
    setEditing(null);
  }

  async function toggleActive(doc: AdminDoctorRow) {
    setTogglingId(doc.id);
    const { error } = await supabase.from("doctors").update({ is_active: !doc.is_active }).eq("id", doc.id);
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
          <Plus className="size-4" /> Add Doctor
        </button>
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No doctors yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Fee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {doc.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        {doc.qualification && <p className="text-xs text-muted-foreground">{doc.qualification}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.departments?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.consultation_fee ? `₹${doc.consultation_fee}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(doc)}
                      disabled={togglingId === doc.id}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        doc.is_active
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      )}
                    >
                      {doc.is_active ? "Active" : "Inactive"}
                    </button>
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

      {addOpen && (
        <DoctorModal
          initial={EMPTY_FORM}
          departments={departments}
          loading={saving}
          onClose={() => setAddOpen(false)}
          onSubmit={addDoctor}
        />
      )}
      {editing && (
        <DoctorModal
          initial={{
            name: editing.name,
            slug: editing.slug,
            qualification: editing.qualification ?? "",
            department_id: editing.department_id ?? "",
            photo_url: editing.photo_url ?? "",
            bio: editing.bio ?? "",
            consultation_fee: editing.consultation_fee != null ? String(editing.consultation_fee) : "",
            is_active: editing.is_active,
          }}
          departments={departments}
          loading={saving}
          onClose={() => setEditing(null)}
          onSubmit={(data) => updateDoctor(editing.id, data)}
        />
      )}
    </div>
  );
}
