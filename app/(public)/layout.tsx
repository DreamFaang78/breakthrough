import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/website/site-header";
import { SiteFooter } from "@/components/website/site-footer";
import { StickyCta } from "@/components/website/sticky-cta";
import { getCurrentHospital } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  if (!hospital) return {};
  return {
    title: {
      template: `%s | ${hospital.name}`,
      default: hospital.name,
    },
    description: hospital.about ?? `Book appointments at ${hospital.name}, ${hospital.city}.`,
    openGraph: {
      siteName: hospital.name,
      locale: "en_IN",
    },
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const hospital = await getCurrentHospital();
  if (!hospital) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        hospitalName={hospital.name}
        phone={hospital.phone}
      />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter hospital={hospital} />
      <StickyCta
        phone={hospital.phone}
        whatsapp={hospital.whatsapp}
        googleMapsUrl={hospital.google_maps_url}
      />
    </div>
  );
}
