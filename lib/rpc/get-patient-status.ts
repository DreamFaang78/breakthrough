import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";

/**
 * Typed wrapper for get_patient_status RPC.
 * Returns safe patient status data for a given phone number.
 */
export async function getPatientStatus(phone: string, ref?: string) {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_patient_status", {
    p_phone: phone.replace(/\D/g, ""),
    p_hospital_id: hospital.id,
    p_ref: ref ?? null,
  });

  if (error) {
    console.error("[rpc:get_patient_status]", error.message);
    return null;
  }

  return data as {
    found: boolean;
    patient_name?: string;
    appointments?: Array<{
      id: string;
      status: string;
      preferred_date: string | null;
      preferred_slot: string | null;
      confirmed_date: string | null;
      confirmed_time: string | null;
      token_number: number | null;
      doctor_name: string | null;
      department_name: string | null;
      follow_up_date: string | null;
    }>;
  };
}
