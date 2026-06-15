import type { Metadata } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import { StatusLookup } from "@/components/patient/status-lookup";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Appointment Status | ${hospital?.name ?? ""}` };
}

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const { phone } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {hospital.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold">Appointment Status</h1>
        <p className="mt-2 text-muted-foreground">
          Apni appointment ka status check karein — bina call kiye.
          <br />
          <span className="text-sm">Check your status without calling us.</span>
        </p>
      </div>

      <StatusLookup
        hospital={{
          id: hospital.id,
          name: hospital.name,
          phone: hospital.phone ?? null,
          whatsapp: hospital.whatsapp ?? null,
          google_maps_url: hospital.google_maps_url ?? null,
        }}
        initialPhone={phone}
      />
    </div>
  );
}
