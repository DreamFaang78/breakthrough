import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hospital = await getCurrentHospital();
  if (!hospital) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("name")
    .eq("slug", slug)
    .eq("hospital_id", hospital.id)
    .maybeSingle();
  return { title: data ? data.name + " | " + hospital.name : "Department" };
}

type Doctor = { id: string; name: string; slug: string; qualification: string | null; opd_days: string[] | null; };
type Service = { id: string; name: string; description: string | null; price: number | null; };

export default async function DepartmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hospital = await getCurrentHospital();
  if (!hospital) notFound();

  const supabase = await createClient();
  const { data: dept } = await supabase
    .from("departments")
    .select("id, name, description")
    .eq("slug", slug)
    .eq("hospital_id", hospital.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!dept) notFound();

  const [{ data: doctors }, { data: services }] = await Promise.all([
    supabase.from("doctors").select("id, name, slug, qualification, opd_days").eq("department_id", dept.id).eq("is_active", true),
    supabase.from("services").select("id, name, description, price").eq("department_id", dept.id).eq("is_active", true),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 space-y-12">
      <div>
        <Link
          href="/departments"
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> All Departments
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Department</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">{dept.name}</h1>
        {dept.description && (
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{dept.description}</p>
        )}
      </div>

      {doctors && doctors.length > 0 && (
        <div>
          <h2 className="mb-5 text-xl font-bold">Our {dept.name} Doctors</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(doctors as unknown as Doctor[]).map((doc) => (
              <Link
                key={doc.id}
                href={`/doctors/${doc.slug}`}
                className="group flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {doc.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{doc.name}</p>
                  {doc.qualification && (
                    <p className="text-xs text-muted-foreground">{doc.qualification}</p>
                  )}
                </div>
                <span className="text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">Book</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {services && services.length > 0 && (
        <div>
          <h2 className="mb-5 text-xl font-bold">Services</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(services as unknown as Service[]).map((svc) => (
              <div key={svc.id} className="rounded-2xl border bg-card p-4">
                <p className="font-semibold">{svc.name}</p>
                {svc.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{svc.description}</p>
                )}
                {svc.price && (
                  <p className="mt-2 text-sm font-medium text-foreground">Rs.{svc.price}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-primary/15 bg-primary/5 p-8 text-center">
        <h2 className="text-xl font-bold">Book a {dept.name} Appointment</h2>
        <p className="mt-2 text-sm text-muted-foreground">Get expert care. Book in under 30 seconds.</p>
        <Link
          href="/book"
          className="mt-6 inline-flex rounded-2xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Book Appointment
        </Link>
      </div>
    </div>
  );
}
