"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { LeadRow } from "@/lib/types";

interface Props {
  leads: LeadRow[];
  today: string;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(date: string | null, today: string) {
  return date != null && date < today;
}

export function FollowUpList({ leads, today }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function markContacted(id: string) {
    setLoadingId(id);
    const { error } = await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", id);

    if (error) {
      toast.error("Could not update status.");
    } else {
      toast.success("Marked as contacted.");
      router.refresh();
    }
    setLoadingId(null);
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <CheckCircle2 className="mx-auto size-10 text-green-500 mb-3" />
        <p className="font-medium">All caught up!</p>
        <p className="mt-1 text-sm text-muted-foreground">Koi follow-up pending nahi hai aaj — sab ho gaya.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? "s" : ""} pending</p>
      {leads.map((lead) => {
        const overdue = isOverdue(lead.follow_up_date, today);
        return (
          <div key={lead.id} className="rounded-2xl border bg-card overflow-hidden">
            <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${overdue ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
              <Clock className={`size-3.5 ${overdue ? "text-red-600" : "text-amber-600"}`} />
              <span className={`text-xs font-semibold ${overdue ? "text-red-700" : "text-amber-700"}`}>
                {overdue ? `Overdue — ${formatDate(lead.follow_up_date)}` : `Due today — ${formatDate(lead.follow_up_date)}`}
              </span>
              <span className="ml-auto rounded-full border border-current px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {lead.status}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold">{lead.name}</p>
                  {(lead.departments?.name || lead.doctors?.name) && (
                    <p className="text-sm text-muted-foreground">
                      {[lead.departments?.name, lead.doctors?.name].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Phone className="size-3.5" /> {lead.phone}
                </a>
              </div>

              {lead.notes && (
                <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{lead.notes}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={loadingId === lead.id || lead.status === "contacted"}
                  onClick={() => markContacted(lead.id)}
                  className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {loadingId === lead.id ? "Saving..." : "Mark Called"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
