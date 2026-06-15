import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `About | ${hospital?.name ?? ""}` };
}

export default async function AboutPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const [{ data: departments }, { count: doctorCount }] = await Promise.all([
    supabase.from("departments").select("id, name, description").eq("hospital_id", hospital.id).eq("is_active", true),
    supabase.from("doctors").select("*", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("is_active", true),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 space-y-16">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Our story</p>
        <h1 className="text-3xl font-bold md:text-4xl">About {hospital.name}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{hospital.about}</p>
      </div>

      {/* Trust points */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: `${doctorCount ?? 0}+ Expert Doctors`, desc: "Qualified, experienced specialists" },
          { label: "20+ Years of Service", desc: `Serving ${hospital.city ?? "our city"} with trusted care` },
          { label: "24 x 7 Emergency", desc: "Round-the-clock emergency care" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border bg-card p-5">
            <CheckCircle2 className="mb-3 size-5 text-primary" />
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Departments */}
      {departments && departments.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-bold">Our Departments</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {departments.map((dept) => (
              <div key={dept.id} className="rounded-xl border bg-card p-4">
                <p className="font-semibold">{dept.name}</p>
                {dept.description && <p className="mt-1 text-sm text-muted-foreground">{dept.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-3xl bg-primary/5 border border-primary/15 p-8 text-center">
        <h2 className="text-xl font-bold">Ready to visit us?</h2>
        <p className="mt-2 text-muted-foreground">Book an appointment in under 30 seconds.</p>
        <Link href="/book" className="mt-6 inline-flex rounded-2xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          Book Appointment
        </Link>
      </div>
    </div>
  );
}
