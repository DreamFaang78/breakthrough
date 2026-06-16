import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import type { Metadata } from "next";
import { CheckCircle2, Stethoscope, Clock, ShieldCheck, Users } from "lucide-react";
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

  const stats = [
    { icon: Users, value: `${doctorCount ?? 0}+`, label: "Expert Doctors" },
    { icon: Stethoscope, value: `${departments?.length ?? 0}`, label: "Specialties" },
    { icon: Clock, value: "24 × 7", label: "Emergency Care" },
    { icon: ShieldCheck, value: "20+", label: "Years of Service" },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-background py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> Trusted Hospital · {hospital.city ?? "India"}
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">{hospital.name}</h1>
          {hospital.about && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{hospital.about}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              Book Appointment
            </Link>
            <Link
              href="/contact"
              className="rounded-2xl border px-6 py-3 font-semibold hover:bg-muted transition-colors"
            >
              Get Directions
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <div className="mb-1 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-4xl px-4 py-16 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Why Choose Us</p>
        <h2 className="text-2xl font-bold">Committed to your wellbeing</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Qualified Specialists", desc: "Board-certified doctors with years of clinical experience in their specialties." },
            { title: "Modern Infrastructure", desc: "Up-to-date diagnostic equipment and hygienic, comfortable facilities." },
            { title: "Patient-First Care", desc: "We listen, explain, and guide — in your language, at your pace." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-5">
              <CheckCircle2 className="mb-3 size-5 text-primary" />
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      {departments && departments.length > 0 && (
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Our Specialties</p>
            <h2 className="mt-1 text-2xl font-bold">Departments we cover</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {departments.map((dept) => (
                <Link
                  key={dept.id}
                  href="/departments"
                  className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Stethoscope className="size-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{dept.name}</p>
                    {dept.description && <p className="mt-0.5 text-xs text-muted-foreground">{dept.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-4xl w-full px-4 py-16">
        <div className="rounded-3xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold">Ready to visit us?</h2>
          <p className="mt-2 text-primary-foreground/80">Book an appointment in under 30 seconds — no waiting on hold.</p>
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
