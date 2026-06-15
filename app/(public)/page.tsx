import Link from "next/link";
import { Phone, MessageCircle, Navigation, Star, CheckCircle2, Clock, Users, Building2, Stethoscope, HeartPulse, Bone, Smile } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import type { DoctorWithDepartment } from "@/lib/types";

const DEPT_ICONS: Record<string, React.ReactNode> = {
  stethoscope: <Stethoscope className="size-5" />,
  bone: <Bone className="size-5" />,
  "heart-pulse": <HeartPulse className="size-5" />,
  tooth: <Smile className="size-5" />,
  default: <Building2 className="size-5" />,
};

export default async function HomePage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();

  const [
    { data: heroData },
    { data: departments },
    { data: doctors },
    { data: testimonials },
    { count: doctorCount },
    { count: deptCount },
  ] = await Promise.all([
    supabase
      .from("hospital_pages")
      .select("content")
      .eq("hospital_id", hospital.id)
      .eq("page_key", "home_hero")
      .maybeSingle(),
    supabase
      .from("departments")
      .select("id, name, slug, description, icon")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .limit(8),
    supabase
      .from("doctors")
      .select("id, name, slug, qualification, bio, opd_days, departments(name)")
      .eq("hospital_id", hospital.id)
      .eq("is_active", true)
      .limit(6),
    supabase
      .from("testimonials")
      .select("id, patient_name, city_area, rating, text")
      .eq("hospital_id", hospital.id)
      .eq("is_published", true)
      .limit(6),
    supabase.from("doctors").select("*", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("is_active", true),
    supabase.from("departments").select("*", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("is_active", true),
  ]);

  const hero = heroData?.content as { title?: string; subtitle?: string } | null;
  const doctorList = (doctors ?? []) as unknown as DoctorWithDepartment[];

  const waNumber = hospital.whatsapp?.replace(/\D/g, "");
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=Namaste%2C+mujhe+appointment+chahiye.` : null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.42_0.22_258/0.12),transparent)]" />

        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center md:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <CheckCircle2 className="size-3.5" />
            Trusted hospital in {hospital.city ?? "your city"}
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl animate-fade-in-up">
            {hero?.title ?? hospital.name}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            {hero?.subtitle ?? hospital.about}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <Link
              href="/book"
              className="w-full rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
            >
              Book Appointment
            </Link>
            {hospital.phone && (
              <a
                href={`tel:${hospital.phone}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                <Phone className="size-4" /> Call Now
              </a>
            )}
          </div>

          <p className="mt-5 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "240ms" }}>
            Already booked?{" "}
            <Link href="/status" className="font-medium text-primary hover:underline">
              Check your appointment status
            </Link>
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
            {[
              { icon: <Users className="size-5" />, value: `${doctorCount ?? 0}+`, label: "Expert Doctors" },
              { icon: <Building2 className="size-5" />, value: `${deptCount ?? 0}`, label: "Specialties" },
              { icon: <Clock className="size-5" />, value: "24 x 7", label: "Emergency Care" },
              { icon: <Star className="size-5" />, value: "20+", label: "Years of Service" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 px-6 py-6 text-center">
                <span className="text-primary">{item.icon}</span>
                <span className="text-xl font-bold text-foreground">{item.value}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-4 py-20">

        {/* Departments */}
        {departments && departments.length > 0 && (
          <section>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">What we treat</p>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">Departments</h2>
              </div>
              <Link href="/departments" className="text-sm font-medium text-primary hover:underline hidden sm:block">
                View all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 stagger">
              {departments.map((dept) => (
                <Link
                  key={dept.id}
                  href={`/departments/${dept.slug}`}
                  className="group animate-fade-in-up rounded-2xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {DEPT_ICONS[dept.icon ?? "default"] ?? DEPT_ICONS.default}
                  </div>
                  <p className="font-semibold text-foreground">{dept.name}</p>
                  {dept.description && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">{dept.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Doctors */}
        {doctorList.length > 0 && (
          <section>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Our team</p>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">Meet the Doctors</h2>
              </div>
              <Link href="/doctors" className="text-sm font-medium text-primary hover:underline hidden sm:block">
                View all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 stagger">
              {doctorList.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/doctors/${doc.slug}`}
                  className="group animate-fade-in-up rounded-2xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {doc.name.charAt(0)}
                  </div>
                  <p className="font-semibold text-foreground">{doc.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{doc.qualification}</p>
                  {doc.departments?.name && (
                    <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {doc.departments.name}
                    </span>
                  )}
                  <p className="mt-3 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Book appointment
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials && testimonials.length > 0 && (
          <section>
            <div className="mb-10">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Patient stories</p>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">What Patients Say</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.id} className="rounded-2xl border bg-card p-6">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {t.patient_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.patient_name}</p>
                      {t.city_area && <p className="text-xs text-muted-foreground">{t.city_area}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Map + Contact */}
        <section className="overflow-hidden rounded-3xl border">
          <div className="grid md:grid-cols-2">
            <div className="aspect-video md:aspect-auto md:min-h-[280px] bg-muted">
              {hospital.google_maps_url ? (
                <iframe
                  src={hospital.google_maps_url + "&output=embed"}
                  className="h-full w-full"
                  loading="lazy"
                  title="Hospital Location"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Map not configured
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-5 p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Find us</p>
                <p className="mt-1 text-xl font-bold">{hospital.name}</p>
                {(hospital.address || hospital.city) && (
                  <p className="mt-1 text-sm text-muted-foreground">{[hospital.address, hospital.city].filter(Boolean).join(", ")}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {hospital.phone && (
                  <a href={`tel:${hospital.phone}`} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
                    <Phone className="size-4 text-primary" /> {hospital.phone}
                  </a>
                )}
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors">
                    <MessageCircle className="size-4" /> Chat on WhatsApp
                  </a>
                )}
                {hospital.google_maps_url && (
                  <a href={hospital.google_maps_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
                    <Navigation className="size-4 text-primary" /> Get Directions
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Strip */}
        {hospital.emergency_phone && (
          <section className="rounded-3xl bg-destructive/8 border border-destructive/20 px-8 py-8 flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-destructive">24 x 7 Emergency</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{hospital.emergency_phone}</p>
              <p className="text-sm text-muted-foreground">Ambulance available. Call immediately.</p>
            </div>
            <a
              href={`tel:${hospital.emergency_phone}`}
              className="flex items-center gap-3 rounded-2xl bg-destructive px-8 py-4 text-base font-bold text-white shadow-lg shadow-destructive/20 hover:opacity-90 transition-opacity"
            >
              <Phone className="size-5" /> Call Emergency
            </a>
          </section>
        )}

      </div>
    </div>
  );
}
