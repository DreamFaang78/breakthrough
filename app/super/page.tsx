import { StatCard } from "@/components/common/stat-card";
import { createClient } from "@/lib/supabase/server";

export default async function SuperDashboardPage() {
  const supabase = await createClient();

  const { count: hospitals } = await supabase
    .from("hospitals")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hospitals" value={hospitals ?? 0} />
      </div>
    </div>
  );
}
