import "server-only";

export interface DigestStats {
  completed: number;
  total_requests: number;
  no_show: number;
  walk_in: number;
  pending_requests: number;
  pending_leads: number;
  yesterday: string;
}

export interface DigestData {
  hospitalId: string;
  hospitalName: string;
  notificationEmail: string | null;
  stats: DigestStats;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildOwnerDigest(hospitalId: string, supabase: any): Promise<DigestData | null> {
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterday = yDate.toISOString().slice(0, 10);

  const [{ data: hospital }, { data: overview }, { count: pendingLeads }, { count: pendingRequests }] =
    await Promise.all([
      supabase.from("hospitals").select("name, notification_email").eq("id", hospitalId).single(),
      supabase.rpc("analytics_overview", { p_hospital_id: hospitalId, p_from: yesterday, p_to: yesterday }),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .in("status", ["new", "contacted"]),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("status", "pending"),
    ]);

  if (!hospital) return null;

  const ov = (overview as Record<string, number>) ?? {};

  return {
    hospitalId,
    hospitalName: hospital.name as string,
    notificationEmail: (hospital.notification_email as string | null) ?? null,
    stats: {
      completed: ov.completed ?? 0,
      total_requests: ov.total_requests ?? 0,
      no_show: ov.no_show ?? 0,
      walk_in: ov.walk_in ?? 0,
      pending_requests: pendingRequests ?? 0,
      pending_leads: pendingLeads ?? 0,
      yesterday,
    },
  };
}
