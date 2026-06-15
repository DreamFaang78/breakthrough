import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { Building2, Stethoscope, HeartPulse, Bone, Smile } from "lucide-react";
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

export default async function DepartmentsPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug, description, icon")
    .eq("hospital_id", hospital.id)
    .eq("is_active", true);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Specialties</p>
        <h1 className="text-3xl font-bold md:text-4xl">Departments</h1>
        <p className="mt-2 text-muted-foreground">Comprehensive care across all major specialties.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {(departments ?? []).map((dept) => (
          <Link
            key={dept.id}
            href={`/departments/${dept.slug}`}
            className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {ICONS[dept.icon ?? "default"] ?? ICONS.default}
            </div>
            <p className="text-lg font-semibold">{dept.name}</p>
            {dept.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dept.description}</p>
            )}
            <p className="mt-4 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View department
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}