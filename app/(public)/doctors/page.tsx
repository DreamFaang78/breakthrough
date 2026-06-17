import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { DoctorsGrid, type DoctorCard } from "@/components/website/doctors-grid";
import { UserRound } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Doctors | ${hospital?.name ?? ""}` };
}

export default async function DoctorsPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const [{ data: doctorsRaw }, { data: depts }] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, name, slug, qualification, opd_days, consultation_fee, department_id, departments(id, name, slug)")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const doctors = (doctorsRaw ?? []) as unknown as DoctorCard[];
  const departments = (depts ?? []) as { id: string; name: string }[];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Our Team</p>
              <h1 className="text-3xl font-bold md:text-4xl">Meet Our Doctors</h1>
              <p className="mt-2 text-muted-foreground">
                {doctors.length > 0 ? `${doctors.length} specialist${doctors.length !== 1 ? "s" : ""}` : "Specialists"} dedicated to your care
              </p>
            </div>
            <div className="hidden md:flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <UserRound className="size-8 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Grid + filter */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <DoctorsGrid doctors={doctors} departments={departments} />
      </section>
    </div>
  );
}
