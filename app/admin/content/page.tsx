import { AdminContentForm } from "@/components/admin/admin-content-form";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AdminContentPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("hospital_pages")
    .select("content")
    .eq("hospital_id", profile?.hospital_id)
    .eq("page_key", "home_hero")
    .maybeSingle();

  const hero = (page?.content as { title?: string; subtitle?: string } | null) ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Website Content</h1>
      <p className="text-sm text-muted-foreground">
        Edit the headline and subtext shown on your homepage.
      </p>
      <AdminContentForm
        hospitalId={profile?.hospital_id ?? ""}
        initial={{ title: hero.title ?? "", subtitle: hero.subtitle ?? "" }}
      />
    </div>
  );
}
