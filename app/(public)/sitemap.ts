import type { MetadataRoute } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hospital = await getCurrentHospital();
  if (!hospital) return [];

  const supabase = await createClient();
  const [{ data: doctors }, { data: departments }] = await Promise.all([
    supabase.from("doctors").select("slug").eq("hospital_id", hospital.id).eq("is_active", true),
    supabase.from("departments").select("slug").eq("hospital_id", hospital.id).eq("is_active", true),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sharma-hospital.hospitalos.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/book`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/doctors`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/departments`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/reviews`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/location`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/emergency`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/status`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const doctorRoutes: MetadataRoute.Sitemap = (doctors ?? []).map((d) => ({
    url: `${base}/doctors/${d.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const departmentRoutes: MetadataRoute.Sitemap = (departments ?? []).map((d) => ({
    url: `${base}/departments/${d.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...doctorRoutes, ...departmentRoutes];
}
