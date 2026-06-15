import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { IndianRupee } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Services | ${hospital?.name ?? ""}` };
}

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  departments: { name: string } | null;
};

export default async function ServicesPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, description, price, departments(name)")
    .eq("hospital_id", hospital.id)
    .eq("is_active", true);
  const services = (data ?? []) as unknown as ServiceRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">What we offer</p>
        <h1 className="text-3xl font-bold md:text-4xl">Services</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {services.map((svc) => (
          <div key={svc.id} className="rounded-2xl border bg-card p-5">
            {svc.departments?.name && (
              <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {svc.departments.name}
              </span>
            )}
            <p className="font-semibold">{svc.name}</p>
            {svc.description && <p className="mt-1 text-sm text-muted-foreground">{svc.description}</p>}
            {svc.price && (
              <div className="mt-3 flex items-center gap-1 text-sm font-semibold">
                <IndianRupee className="size-3.5" />{svc.price}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="/book" className="inline-flex rounded-2xl bg-primary px-8 py-4 font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          Book an Appointment
        </Link>
      </div>
    </div>
  );
}
