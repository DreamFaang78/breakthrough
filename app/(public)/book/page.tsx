import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { BookingForm } from "@/components/booking/booking-form";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Book Appointment | ${hospital?.name ?? ""}` };
}

type Doctor = {
  id: string;
  name: string;
  slug: string;
  department_id: string;
  qualification: string | null;
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ doctor?: string }>;
}) {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const { doctor: doctorSlug } = await searchParams;

  const supabase = await createClient();
  const [{ data: departments }, { data: doctors }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("doctors")
      .select("id, name, slug, department_id, qualification")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const preselectedDoctor = (doctors as unknown as Doctor[] | null)?.find(
    (d) => d.slug === doctorSlug
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {hospital.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Book Appointment</h1>
        <p className="mt-2 text-muted-foreground">
          Fill in the details below. We&apos;ll confirm your slot shortly.
          <br />
          <span className="text-sm">Neeche details bharein — hum jald confirm karenge.</span>
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <BookingForm
          hospitalId={hospital.id}
          departments={departments ?? []}
          doctors={(doctors ?? []) as unknown as Doctor[]}
          phone={undefined}
          defaultDepartmentId={preselectedDoctor?.department_id}
          defaultDoctorId={preselectedDoctor?.id}
        />
      </div>

      {/* Trust signal */}
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span>🔒 Secure & private</span>
        <span>⚡ Confirmed within hours</span>
        <span>📞 No-confirm? We call you</span>
      </div>
    </div>
  );
}
