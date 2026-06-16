import { AdminTestimonialsTable } from "@/components/admin/admin-testimonials-table";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTestimonialsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("id, patient_name, city_area, rating, text, is_published, created_at")
    .eq("hospital_id", profile?.hospital_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Testimonials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage patient reviews shown on your public website homepage.
        </p>
      </div>
      <AdminTestimonialsTable
        testimonials={testimonials ?? []}
        hospitalId={profile?.hospital_id ?? ""}
      />
    </div>
  );
}
