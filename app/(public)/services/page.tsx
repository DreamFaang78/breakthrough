import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { IndianRupee, Stethoscope } from "lucide-react";

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
    .eq("is_active", true)
    .order("name");
  const services = (data ?? []) as unknown as ServiceRow[];

  // Group by department
  const grouped = new Map<string, ServiceRow[]>();
  for (const svc of services) {
    const key = svc.departments?.name ?? "General";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(svc);
  }
  const sections = [...grouped.entries()];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-16">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">What We Offer</p>
          <h1 className="text-3xl font-bold md:text-4xl">Services & Procedures</h1>
          <p className="mt-2 text-muted-foreground">
            {services.length} service{services.length !== 1 ? "s" : ""} across all departments — transparent pricing, no hidden fees.
          </p>
        </div>
      </section>

      {/* Grouped service list */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-16 space-y-10">
        {sections.map(([deptName, deptServices]) => (
          <div key={deptName}>
            {/* Department header */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <Stethoscope className="size-3.5 text-primary" />
              </div>
              <h2 className="text-base font-bold">{deptName}</h2>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {deptServices.length} service{deptServices.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Service rows */}
            <div className="divide-y rounded-2xl border bg-card">
              {deptServices.map((svc) => (
                <div key={svc.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-snug">{svc.name}</p>
                    {svc.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{svc.description}</p>
                    )}
                  </div>
                  {svc.price != null && (
                    <div className="shrink-0 flex items-center gap-0.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      <IndianRupee className="size-3.5" />
                      {svc.price}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">Services coming soon.</p>
        )}

        {/* CTA */}
        <div className="rounded-3xl bg-primary px-8 py-10 text-center text-primary-foreground">
          <h2 className="text-xl font-bold">Ready to get started?</h2>
          <p className="mt-1.5 text-sm text-primary-foreground/80">Book your appointment — all prices are transparent, no surprise fees.</p>
          <Link
            href="/book"
            className="mt-6 inline-flex rounded-2xl bg-white px-8 py-3.5 font-semibold text-primary shadow-lg hover:opacity-90 transition-opacity"
          >
            Book Appointment
          </Link>
        </div>
      </section>
    </div>
  );
}
