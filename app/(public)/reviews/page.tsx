import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { Star } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Reviews | ${hospital?.name ?? ""}` };
}

export default async function ReviewsPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("id, patient_name, city_area, rating, text")
    .eq("hospital_id", hospital.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const avgRating = testimonials?.length
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Social proof</p>
        <h1 className="text-3xl font-bold md:text-4xl">Patient Reviews</h1>
        {avgRating && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`size-5 ${i < Math.round(parseFloat(avgRating)) ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
              ))}
            </div>
            <span className="font-bold text-lg">{avgRating}</span>
            <span className="text-muted-foreground text-sm">({testimonials?.length} reviews)</span>
          </div>
        )}
      </div>

      {testimonials && testimonials.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-2xl border bg-card p-6">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold">{t.patient_name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold">{t.patient_name}</p>
                  {t.city_area && <p className="text-xs text-muted-foreground">{t.city_area}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No reviews yet.</p>
      )}

      <div className="mt-12 text-center">
        <Link href="/book" className="inline-flex rounded-2xl bg-primary px-8 py-4 font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          Book Your Appointment
        </Link>
      </div>
    </div>
  );
}
