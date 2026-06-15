import type { Metadata } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import { MapPin, Navigation, Phone } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Location | ${hospital?.name ?? ""}` };
}

export default async function LocationPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 space-y-8">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Find us</p>
        <h1 className="text-3xl font-bold md:text-4xl">Location & Directions</h1>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-3xl border aspect-video">
        {hospital.google_maps_url ? (
          <iframe
            src={hospital.google_maps_url + "&output=embed"}
            className="h-full w-full"
            loading="lazy"
            title="Hospital Location Map"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
            Map not configured
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-3">
        {hospital.address && (
          <div className="rounded-2xl border bg-card p-5">
            <MapPin className="mb-2 size-5 text-primary" />
            <p className="font-semibold">Address</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{hospital.address}</p>
          </div>
        )}
        {hospital.phone && (
          <a href={`tel:${hospital.phone}`} className="rounded-2xl border bg-card p-5 hover:border-primary/30 transition-colors">
            <Phone className="mb-2 size-5 text-primary" />
            <p className="font-semibold">Phone</p>
            <p className="mt-1 text-sm text-muted-foreground">{hospital.phone}</p>
          </a>
        )}
        {hospital.google_maps_url && (
          <a href={hospital.google_maps_url} target="_blank" rel="noreferrer" className="rounded-2xl border bg-card p-5 hover:border-primary/30 transition-colors">
            <Navigation className="mb-2 size-5 text-primary" />
            <p className="font-semibold">Directions</p>
            <p className="mt-1 text-sm text-muted-foreground">Open in Google Maps</p>
          </a>
        )}
      </div>
    </div>
  );
}
