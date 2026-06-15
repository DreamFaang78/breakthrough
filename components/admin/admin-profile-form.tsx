"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AdminHospitalRow } from "@/lib/types";

interface Props {
  hospital: AdminHospitalRow;
  arrivalInstruction: { hi: string; en: string };
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

const LANGUAGES = [
  { value: "hinglish", label: "Hinglish" },
  { value: "hi", label: "Hindi" },
  { value: "en", label: "English" },
];

type FormState = {
  name: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  emergency_phone: string;
  google_maps_url: string;
  about: string;
  default_language: string;
  notification_email: string;
  logo_url: string;
  arrival_hi: string;
  arrival_en: string;
};

export function AdminProfileForm({ hospital, arrivalInstruction }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState<FormState>({
    name: hospital.name ?? "",
    address: hospital.address ?? "",
    city: hospital.city ?? "",
    phone: hospital.phone ?? "",
    whatsapp: hospital.whatsapp ?? "",
    emergency_phone: hospital.emergency_phone ?? "",
    google_maps_url: hospital.google_maps_url ?? "",
    about: hospital.about ?? "",
    default_language: hospital.default_language ?? "hinglish",
    notification_email: hospital.notification_email ?? "",
    logo_url: hospital.logo_url ?? "",
    arrival_hi: arrivalInstruction.hi,
    arrival_en: arrivalInstruction.en,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Hospital name is required.");
      return;
    }
    setSaving(true);

    const { error: hospitalError } = await supabase
      .from("hospitals")
      .update({
        name: form.name.trim(),
        address: form.address || null,
        city: form.city || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        emergency_phone: form.emergency_phone || null,
        google_maps_url: form.google_maps_url || null,
        about: form.about || null,
        default_language: form.default_language,
        notification_email: form.notification_email || null,
        logo_url: form.logo_url || null,
      })
      .eq("id", hospital.id);

    if (hospitalError) {
      toast.error(hospitalError.message);
      setSaving(false);
      return;
    }

    const { error: settingsError } = await supabase
      .from("settings")
      .upsert(
        {
          hospital_id: hospital.id,
          key: "arrival_instruction",
          value: { hi: form.arrival_hi, en: form.arrival_en },
        },
        { onConflict: "hospital_id,key" }
      );

    if (settingsError) {
      toast.error(settingsError.message);
      setSaving(false);
      return;
    }

    toast.success("Saved successfully.");
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="max-w-2xl space-y-6 rounded-2xl border bg-card p-6">
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Basic Information</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Hospital Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={`${fieldClass} mt-1.5`} />
          </div>
          <div>
            <label className="block text-sm font-medium">City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={`${fieldClass} mt-1.5`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Address</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={`${fieldClass} mt-1.5`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">About</label>
            <textarea
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
              rows={3}
              className={`${fieldClass} mt-1.5 resize-none`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Logo URL (optional)</label>
            <input
              value={form.logo_url}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://..."
              className={`${fieldClass} mt-1.5`}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Contact</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={`${fieldClass} mt-1.5`} />
          </div>
          <div>
            <label className="block text-sm font-medium">WhatsApp</label>
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={`${fieldClass} mt-1.5`} />
          </div>
          <div>
            <label className="block text-sm font-medium">Emergency Phone</label>
            <input
              value={form.emergency_phone}
              onChange={(e) => set("emergency_phone", e.target.value)}
              className={`${fieldClass} mt-1.5`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Notification Email</label>
            <input
              type="email"
              value={form.notification_email}
              onChange={(e) => set("notification_email", e.target.value)}
              className={`${fieldClass} mt-1.5`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Google Maps URL</label>
            <input
              value={form.google_maps_url}
              onChange={(e) => set("google_maps_url", e.target.value)}
              placeholder="https://maps.google.com/..."
              className={`${fieldClass} mt-1.5`}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Preferences</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium">Default Website Language</label>
            <select
              value={form.default_language}
              onChange={(e) => set("default_language", e.target.value)}
              className={`${fieldClass} mt-1.5`}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Arrival Instructions (Hindi)</label>
            <textarea
              value={form.arrival_hi}
              onChange={(e) => set("arrival_hi", e.target.value)}
              rows={2}
              className={`${fieldClass} mt-1.5 resize-none`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Arrival Instructions (English)</label>
            <textarea
              value={form.arrival_en}
              onChange={(e) => set("arrival_en", e.target.value)}
              rows={2}
              className={`${fieldClass} mt-1.5 resize-none`}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
