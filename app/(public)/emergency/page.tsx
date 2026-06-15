import type { Metadata } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import { Phone, Clock, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "Emergency" };

export default async function EmergencyPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  return (
    <div className="flex min-h-[70vh] items-center">
      <div className="mx-auto max-w-2xl w-full px-4 py-16 text-center space-y-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 text-sm font-semibold text-destructive">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
            24 × 7 Emergency Services
          </span>
          <h1 className="mt-6 text-4xl font-bold md:text-5xl">Emergency Contact</h1>
          <p className="mt-3 text-muted-foreground">If this is a life-threatening emergency, call immediately.</p>
        </div>

        {hospital.emergency_phone && (
          <a
            href={`tel:${hospital.emergency_phone}`}
            className="mx-auto flex w-fit items-center gap-4 rounded-3xl bg-destructive px-10 py-6 text-2xl font-bold text-white shadow-2xl shadow-destructive/30 hover:opacity-90 transition-opacity animate-pulse-border"
          >
            <Phone className="size-8" />
            {hospital.emergency_phone}
          </a>
        )}

        <div className="grid gap-4 sm:grid-cols-2 text-left max-w-md mx-auto">
          <div className="rounded-2xl border bg-card p-4">
            <Clock className="mb-2 size-5 text-destructive" />
            <p className="font-semibold">Always Available</p>
            <p className="text-sm text-muted-foreground">24 hours, 7 days a week, 365 days a year</p>
          </div>
          {hospital.address && (
            <div className="rounded-2xl border bg-card p-4">
              <MapPin className="mb-2 size-5 text-destructive" />
              <p className="font-semibold">Location</p>
              <p className="text-sm text-muted-foreground">{hospital.address}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
