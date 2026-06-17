import type { ComponentType } from "react";

type Tone = "default" | "primary" | "success" | "warning" | "danger";

const TONE_CHIP: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: number | string;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="group animate-fade-in-up rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${TONE_CHIP[tone]}`}
          >
            <Icon className="size-5" />
          </span>
        )}
      </div>
    </div>
  );
}
