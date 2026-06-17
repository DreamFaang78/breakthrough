import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { Building2, Stethoscope, HeartPulse, Bone, Smile, ChevronRight, Users } from "lucide-react";
import type React from "react";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Departments | ${hospital?.name ?? ""}` };
}

const ICONS: Record<string, React.ReactNode> = {
  stethoscope: <Stethoscope className="size-6" />,
  bone: <Bone className="size-6" />,
  "heart-pulse": <HeartPulse className="size-6" />,
  tooth: <Smile className="size-6" />,
  default: <Building2 className="size-6" />,
};

const ACCENT_CLASSES = [
  { card: "border-blue-100 hover:border-blue-200", icon: "bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white" },
  { card: "border-emerald-100 hover:border-emerald-200", icon: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white" },
  { card: "border-violet-100 hover:border-violet-200", icon: "bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white" },
  { card: "border-amber-100 hover:border-amber-200", icon: "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white" },
  { card: "border-rose-100 hover:border-rose-200", icon: "bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white" },
  { card: "border-cyan-100 hover:border-cyan-200", icon: "bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white" },
];

export default async function DepartmentsPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const [{ data: departments }, { data: allDoctors }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, slug, description, icon")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true),
    supabase
      .from("doctors")
      .select("department_id")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true),
  ]);

  // Count doctors per department
  const doctorCountMap: Record<string, number> = {};
  for (const doc of allDoctors ?? []) {
    if (doc.department_id) {
      doctorCountMap[doc.department_id] = (doctorCountMap[doc.department_id] ?? 0) + 1;
    }
  }

  const depts = departments ?? [];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">What We Treat</p>
          <h1 className="text-3xl font-bold md:text-4xl">Our Specialties</h1>
          <p className="mt-2 text-muted-foreground">
            Comprehensive care across {depts.length} department{depts.length !== 1 ? "s" : ""} — all under one roof.
          </p>
        </div>
      </section>

      {/* Department cards */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {depts.map((dept, i) => {
            const accent = ACCENT_CLASSES[i % ACCENT_CLASSES.length];
            const docCount = doctorCountMap[dept.id] ?? 0;

            return (
              <Link
                key={dept.id}
                href={`/departments/${dept.slug}`}
                className={`group flex flex-col rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${accent.card}`}
              >
                <div className={`mb-4 flex size-13 items-center justify-center rounded-2xl transition-colors ${accent.icon}`}>
                  {ICONS[dept.icon ?? "default"] ?? ICONS.default}
                </div>

                <p className="text-lg font-semibold">{dept.name}</p>
                {dept.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground flex-1">{dept.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  {docCount > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {docCount} doctor{docCount !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-0.5 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    View <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl border border-primary/15 bg-primary/5 p-8 text-center">
          <h2 className="text-xl font-bold">Not sure which department you need?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Book a general OPD slot and our doctors will guide you.</p>
          <Link
            href="/book"
            className="mt-6 inline-flex rounded-2xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Book Appointment
          </Link>
        </div>
      </section>
    </div>
  );
}
