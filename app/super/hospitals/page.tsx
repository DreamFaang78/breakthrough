import { createClient } from "@/lib/supabase/server";

export default async function SuperHospitalsPage() {
  const supabase = await createClient();
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name, slug, city, is_active");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Hospitals</h1>
      <div className="overflow-hidden rounded-xl border">
        {hospitals?.map((hospital) => (
          <div
            key={hospital.id}
            className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0"
          >
            <div>
              <p className="font-medium">{hospital.name}</p>
              <p className="text-sm text-muted-foreground">
                {hospital.slug}
                {hospital.city ? ` · ${hospital.city}` : ""}
              </p>
            </div>
            <span
              className={
                hospital.is_active
                  ? "text-sm font-medium text-primary"
                  : "text-sm text-muted-foreground"
              }
            >
              {hospital.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
