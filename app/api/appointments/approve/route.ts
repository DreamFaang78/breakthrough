import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getHospitalById } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["receptionist", "owner", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    appointmentId: string;
    doctorId?: string | null;
    confirmedDate: string;
    confirmedTime: string;
    patientName?: string;
    patientPhone?: string;
    departmentName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { appointmentId, doctorId, confirmedDate, confirmedTime, patientName, patientPhone, departmentName } = body;

  if (!appointmentId || !confirmedDate || !confirmedTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("assign_appointment", {
    p_appointment_id: appointmentId,
    p_doctor_id: doctorId || null,
    p_confirmed_date: confirmedDate,
    p_confirmed_time: confirmedTime,
  });

  if (error) {
    console.error("[approve] assign_appointment failed:", error.message);
    return NextResponse.json({ error: "Failed to approve appointment" }, { status: 500 });
  }

  // Resolve doctor name if assigned
  let doctorName: string | undefined;
  if (doctorId) {
    const { data: doc } = await supabase.from("doctors").select("name").eq("id", doctorId).single();
    doctorName = doc?.name ?? undefined;
  }

  // Look up the patient's email so the confirmation reaches them (if they gave one)
  const { data: apptRow } = await supabase
    .from("appointments")
    .select("patients(email)")
    .eq("id", appointmentId)
    .single();
  const patientEmail =
    (apptRow as { patients?: { email?: string | null } | null } | null)?.patients?.email ?? undefined;

  const hospital = profile.hospital_id ? await getHospitalById(profile.hospital_id) : null;

  // Fire-and-forget — never block the response
  notify("appointment_approved", {
    hospitalId: profile.hospital_id ?? "",
    hospitalName: hospital?.name ?? "",
    notificationEmail: hospital?.notification_email ?? undefined,
    patientName,
    patientPhone,
    patientEmail,
    departmentName,
    doctorName,
    confirmedDate,
    confirmedTime,
    appointmentId,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
