import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { Calendar, Clock, IndianRupee, ArrowLeft } from "lucide-react";
import type { DoctorDetail } from "@/lib/types";

type OpdTimings = Record<string, { start: string; end: string }>;

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hospital = await getCurrentHospital();
  if (!hospital) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("doctors").select("name, qualification").eq("slug", slug).eq("hospital_id", hospital.id).maybeSingle();
  return { title: data ? `${data.name} | ${hospital.name}` : "Doctor" };
}

export default async function DoctorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hospital = await getCurrentHospital();
  if (!hospital) notFound();

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("doctors")
    .select("id, name, slug, qualification, bio, opd_days, opd_timings, consultation_fee, departments(name, slug)")
    .eq("slug", slug)
    .eq("hospital_id", hospital.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!doc) notFound();

  const doctor = doc as unknown as DoctorDetail;
  const opdDays = (doctor.opd_days ?? []) as string[];
  const opdTimings = (doctor.opd_timings ?? {}) as OpdTimings;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/doctors" className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> All Doctors
      </Link>

      <div className="rounded-3xl border bg-card p-8">
        <div className="flex items-start gap-6">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
            {doc.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{doc.name}</h1>
            {doc.qualification && <p className="mt-0.5 text-muted-foreground">{doc.qualification}</p>}
            {doctor.departments?.name && (
              <Link
                href={`/departments/${doctor.departments.slug}`}
                className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary hover:bg-primary/20"
              >
                {doctor.departments.name}
              </Link>
            )}
          </div>
        </div>

        {doc.bio && (
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{doc.bio}</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {opdDays.length > 0 && (
            <div className="rounded-2xl bg-muted/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Calendar className="size-4 text-primary" /> OPD Days
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_ORDER.map((day) => (
                  <span
                    key={day}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      opdDays.includes(day)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(opdTimings).length > 0 && (
            <div className="rounded-2xl bg-muted/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-4 text-primary" /> OPD Timings
              </div>
              <div className="space-y-1">
                {Object.entries(opdTimings)
                  .filter(([day]) => opdDays.includes(day))
                  .slice(0, 5)
                  .map(([day, t]) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{day}</span>
                      <span className="font-medium">{t.start} – {t.end}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {doc.consultation_fee && (
            <div className="rounded-2xl bg-muted/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <IndianRupee className="size-4 text-primary" /> Consultation Fee
              </div>
              <p className="text-2xl font-bold">&#8377;{doc.consultation_fee}</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link
            href={`/book?doctor=${doc.slug}`}
            className="block w-full rounded-2xl bg-primary px-6 py-4 text-center font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            Book Appointment with {doc.name}
          </Link>
        </div>
      </div>
    </div>
  );
}