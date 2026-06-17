import { Sunrise, Sun, Sunset } from "lucide-react";

const TZ = "Asia/Kolkata";

export function DashboardHero({
  name,
  prefix,
  summary,
}: {
  name: string;
  prefix?: string;
  summary?: string;
}) {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now)
  );
  const { greeting, Icon } =
    hour < 12
      ? { greeting: "Good morning", Icon: Sunrise }
      : hour < 17
        ? { greeting: "Good afternoon", Icon: Sun }
        : { greeting: "Good evening", Icon: Sunset };

  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  // Avoid "Dr. Dr. Rakesh" when the stored name already carries the title.
  const lower = name.toLowerCase();
  const showPrefix = Boolean(prefix) && !lower.startsWith("dr.") && !lower.startsWith("dr ");

  return (
    <section className="animate-fade-in-up overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.07] via-card to-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Icon className="size-4" /> {greeting}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight md:text-3xl">
            {showPrefix ? `${prefix} ` : ""}
            {name}
          </h1>
          {summary && <p className="mt-1.5 text-sm text-muted-foreground">{summary}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{weekday}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
    </section>
  );
}
