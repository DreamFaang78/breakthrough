"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TestimonialRow {
  id: string;
  patient_name: string;
  city_area: string | null;
  rating: number;
  text: string;
  is_published: boolean;
  created_at: string;
}

interface Props {
  testimonials: TestimonialRow[];
  hospitalId: string;
}

const fieldClass =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          className={cn("transition-colors", onChange ? "cursor-pointer hover:scale-110" : "cursor-default")}
        >
          <Star
            className={cn("size-4", i <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300")}
          />
        </button>
      ))}
    </div>
  );
}

interface FormState {
  patient_name: string;
  city_area: string;
  rating: number;
  text: string;
  is_published: boolean;
}

const EMPTY_FORM: FormState = {
  patient_name: "",
  city_area: "",
  rating: 5,
  text: "",
  is_published: true,
};

function TestimonialModal({
  title,
  initial,
  onClose,
  onSubmit,
  loading,
}: {
  title: string;
  initial: FormState;
  onClose: () => void;
  onSubmit: (values: FormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Patient Name *</label>
            <input
              value={form.patient_name}
              onChange={(e) => set("patient_name", e.target.value)}
              placeholder="e.g. Ravi Sharma"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">City / Area</label>
            <input
              value={form.city_area}
              onChange={(e) => set("city_area", e.target.value)}
              placeholder="e.g. Civil Lines, Kanpur"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rating</label>
            <StarRating value={form.rating} onChange={(v) => set("rating", v)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Testimonial *</label>
            <textarea
              value={form.text}
              onChange={(e) => set("text", e.target.value)}
              rows={4}
              placeholder="What did the patient say about their experience?"
              className={cn(fieldClass, "resize-none")}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => set("is_published", !form.is_published)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                form.is_published ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  form.is_published ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
            <span className="text-sm font-medium">Published on website</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.patient_name.trim() || !form.text.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminTestimonialsTable({ testimonials, hospitalId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<TestimonialRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleAdd(form: FormState) {
    setSaving(true);
    const { error } = await supabase.from("testimonials").insert({
      hospital_id: hospitalId,
      patient_name: form.patient_name.trim(),
      city_area: form.city_area.trim() || null,
      rating: form.rating,
      text: form.text.trim(),
      is_published: form.is_published,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Testimonial added");
    setShowAdd(false);
    router.refresh();
  }

  async function handleEdit(form: FormState) {
    if (!editRow) return;
    setSaving(true);
    const { error } = await supabase.from("testimonials").update({
      patient_name: form.patient_name.trim(),
      city_area: form.city_area.trim() || null,
      rating: form.rating,
      text: form.text.trim(),
      is_published: form.is_published,
    }).eq("id", editRow.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Testimonial updated");
    setEditRow(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this testimonial? This cannot be undone.")) return;
    setDeletingId(id);
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    setDeletingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Testimonial deleted");
    router.refresh();
  }

  async function togglePublished(row: TestimonialRow) {
    setTogglingId(row.id);
    const { error } = await supabase.from("testimonials").update({ is_published: !row.is_published }).eq("id", row.id);
    setTogglingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(row.is_published ? "Hidden from website" : "Published on website");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {testimonials.filter((t) => t.is_published).length} published · {testimonials.length} total
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" /> Add Testimonial
        </button>
      </div>

      {testimonials.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No testimonials yet. Add your first one to show patient stories on the website.
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Testimonial</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.patient_name}</p>
                    {t.city_area && <p className="text-xs text-muted-foreground">{t.city_area}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StarRating value={t.rating} />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="line-clamp-2 text-muted-foreground">{t.text}</p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublished(t)}
                      disabled={togglingId === t.id}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        t.is_published
                          ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {t.is_published ? "Published" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditRow(t)}
                        className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <TestimonialModal
          title="Add Testimonial"
          initial={EMPTY_FORM}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
          loading={saving}
        />
      )}

      {editRow && (
        <TestimonialModal
          title="Edit Testimonial"
          initial={{
            patient_name: editRow.patient_name,
            city_area: editRow.city_area ?? "",
            rating: editRow.rating,
            text: editRow.text,
            is_published: editRow.is_published,
          }}
          onClose={() => setEditRow(null)}
          onSubmit={handleEdit}
          loading={saving}
        />
      )}
    </div>
  );
}
