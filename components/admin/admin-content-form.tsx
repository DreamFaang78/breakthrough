"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Props {
  hospitalId: string;
  initial: { title: string; subtitle: string };
}

const fieldClass =
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

export function AdminContentForm({ hospitalId, initial }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    const { error } = await supabase
      .from("hospital_pages")
      .upsert(
        {
          hospital_id: hospitalId,
          page_key: "home_hero",
          content: { title: title || null, subtitle: subtitle || null },
        },
        { onConflict: "hospital_id,page_key" }
      );

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Saved successfully.");
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border bg-card p-6">
      <div>
        <label className="block text-sm font-medium">Homepage Title</label>
        <p className="text-xs text-muted-foreground">Leave blank to use your hospital name.</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${fieldClass} mt-1.5`} />
      </div>
      <div>
        <label className="block text-sm font-medium">Homepage Subtitle</label>
        <p className="text-xs text-muted-foreground">Leave blank to use your &quot;About&quot; text from Profile.</p>
        <textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={3}
          className={`${fieldClass} mt-1.5 resize-none`}
        />
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
