import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sharma-hospital.hospitalos.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/reception/", "/doctor/", "/super/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
