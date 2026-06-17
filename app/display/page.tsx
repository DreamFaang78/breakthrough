import { TokenDisplay, type ActiveAppointment } from "@/components/display/token-display";
import { getCurrentHospital } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

export default async function DisplayPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Hospital not found.
      </div>
    );
  }

  const supabase = await createClient();

  // Appointments currently in consultation or arrived today, sorted by token
  const today = new Date().toISOString().slice(0, 10);
  const { data: active } = await supabase
    .from("appointments")
    .select("id, token_number, status, doctors(name), departments(name), patients(name)")
    .eq("hospital_id", hospital.id)
    .in("status", ["in_consultation", "arrived"])
    .eq("confirmed_date", today)
    .order("token_number", { ascending: true });

  return (
    <TokenDisplay
      hospitalName={hospital.name}
      hospitalId={hospital.id}
      initial={(active ?? []) as unknown as ActiveAppointment[]}
      today={today}
    />
  );
}
