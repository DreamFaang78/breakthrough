import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { Calendar } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Doctors | ${hospital?.name ?? ""}` };
}

type Doctor = {
  id: string;
  name: string;
  slug: string;
  qualification: string | null;
  bio: string | null;
  opd_days: string[] | null;
  consultation_fee: number | null;
  departments: { name: string; slug: string } | null;
};

export default async function DoctorsPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("doctors")
    .select("id, name, slug, qualification, bio, opd_days, consultation_fee, departments(name, slug)")
    .eq("hospital_id", hospital.id)
    .eq("is_active", true);
  const doctors = (data ?? []) as unknown as Doctor[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Our team</p>
        <h1 className="text-3xl font-bold md:text-4xl">Our Doctors</h1>
        <p className="mt-2 text-muted-foreground">Experienced specialists dedicated to your care.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {doctors.map((doc) => (
          <Link
            key={doc.id}
            href={`/doctors/${doc.slug}`}
            className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {doc.name.charAt(0)}
            </div>

            <p className="text-lg font-semibold leading-tight">{doc.name}</p>
            {doc.qualification && (
              <p className="mt-0.5 text-sm text-muted-foreground">{doc.qualification}</p>
            )}

            {doc.departments?.name && (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {doc.departments.name}
              </span>
            )}

            {doc.opd_days && doc.opd_days.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                {doc.opd_days.slice(0, 3).join(", ")}
                {doc.opd_days.length > 3 && ` +${doc.opd_days.length - 3} more`}
              </div>
            )}

            {doc.consultation_fee && (
              <p className="mt-2 text-sm font-medium text-foreground">Rs.{doc.consultation_fee} consultation</p>
            )}

            <p className="mt-4 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View profile and book
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}