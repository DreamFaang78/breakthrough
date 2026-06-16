import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHospital } from "@/lib/tenant";
import { notify } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone"),
  appointment_id: z.string().uuid(),
  action: z.enum(["reschedule", "cancel"]),
  reason: z.string().max(200).optional(),
});

/**
 * POST /api/status/reschedule
 * Patient-initiated reschedule or cancel request.
 * Calls request_reschedule_or_cancel RPC (PRD §30) — does NOT directly mutate the confirmed schedule.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { phone, appointment_id, action, reason } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_reschedule_or_cancel", {
    p_phone: phone,
    p_appointment_id: appointment_id,
    p_action: action,
    p_meta: reason ? { reason } : {},
  });

  if (error) {
    console.error("[reschedule] RPC error:", error.message);
    if (error.message.includes("not_found")) {
      return NextResponse.json({ error: "Appointment not found for this phone number." }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not submit request. Please try again." }, { status: 500 });
  }

  // Notify hospital staff
  const hospital = await getCurrentHospital();
  if (hospital) {
    notify(action === "cancel" ? "cancellation_request" : "reschedule_request", {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      notificationEmail: hospital.notification_email ?? undefined,
      patientPhone: phone,
      appointmentId: appointment_id,
      reason,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
