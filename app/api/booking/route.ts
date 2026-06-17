import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validation/booking";
import { getCurrentHospital } from "@/lib/tenant";
import { notify } from "@/lib/notify";

/**
 * POST /api/booking
 * Public booking endpoint — calls create_appointment_request RPC (PRD §30).
 * Rate-limited per IP; honeypot checked; Zod-validated before hitting the DB.
 */
export async function POST(request: NextRequest) {
  // CF-Connecting-IP is set by Cloudflare and cannot be spoofed; fall back to x-real-ip on Vercel direct.
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-real-ip") ?? "unknown";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ----- Honeypot check -----
  if (typeof body === "object" && body !== null && "_hp" in body && (body as Record<string, unknown>)._hp) {
    // Bot detected — silently succeed but don't write anything
    return NextResponse.json({ appointment_id: "honeypot", message: "ok" });
  }

  // ----- Cloudflare Turnstile verification -----
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token =
      typeof body === "object" && body !== null && "cf_turnstile_response" in body
        ? String((body as Record<string, unknown>).cf_turnstile_response ?? "")
        : "";

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: turnstileSecret, response: token, remoteip: ip }),
      }
    );
    const verifyData = (await verifyRes.json()) as { success: boolean };
    if (!verifyData.success) {
      return NextResponse.json(
        { error: "Security check failed. Please refresh and try again." },
        { status: 400 }
      );
    }
  }

  // ----- Resolve hospital -----
  const hospital = await getCurrentHospital();
  if (!hospital) {
    return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
  }

  // Inject hospital_id if not provided by client
  const payload = {
    ...(typeof body === "object" && body !== null ? body : {}),
    hospital_id: hospital.id,
  };

  // ----- Zod validation -----
  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // ----- Call Supabase RPC -----
  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("create_appointment_request", {
    payload: {
      hospital_id: data.hospital_id,
      department_id: data.department_id,
      doctor_id: data.doctor_id || null,
      type: data.type,
      preferred_date: data.preferred_date,
      preferred_slot: data.preferred_slot,
      name: data.name,
      phone: data.phone,
      age: data.age,
      gender: data.gender,
      city_area: data.city_area || null,
      problem: data.problem || null,
    },
  });

  if (error) {
    console.error("[booking] RPC error:", error.message, { ip });

    if (error.message.includes("invalid_hospital")) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }
    if (error.message.includes("invalid_phone")) {
      return NextResponse.json(
        { error: "Validation failed", issues: { phone: ["Enter a valid 10-digit phone number"] } },
        { status: 422 }
      );
    }
    if (error.message.includes("invalid_date")) {
      return NextResponse.json(
        { error: "Validation failed", issues: { preferred_date: ["Date cannot be in the past"] } },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Resolve department name for the notification (non-blocking)
  const { data: dept } = await supabase
    .from("departments")
    .select("name")
    .eq("id", data.department_id)
    .single();

  const appointmentId = (result as { appointment_id?: string })?.appointment_id;

  // Persist the patient's email (additive, first-write-only) so future status
  // emails can reach them. Best-effort — never block or fail the booking.
  if (data.email) {
    const { error: emailErr } = await supabase.rpc("set_patient_email", {
      p_hospital_id: hospital.id,
      p_phone: data.phone,
      p_email: data.email,
    });
    if (emailErr) console.error("[booking] set_patient_email failed:", emailErr.message);
  }

  // Fire-and-forget notification to hospital staff — never block the response
  notify("new_request", {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    notificationEmail: hospital.notification_email ?? undefined,
    patientName: data.name,
    patientPhone: data.phone,
    departmentName: dept?.name ?? undefined,
    preferredDate: data.preferred_date,
    preferredSlot: data.preferred_slot,
    appointmentId,
  }).catch(() => {}); // already logged inside notify()

  // Automated confirmation email to the patient (only sends if they gave an email)
  if (data.email) {
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const statusUrl = host
      ? `${proto}://${host}/status?phone=${encodeURIComponent(data.phone)}`
      : undefined;

    notify("booking_received", {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      patientName: data.name,
      patientEmail: data.email,
      departmentName: dept?.name ?? undefined,
      preferredDate: data.preferred_date,
      preferredSlot: data.preferred_slot,
      appointmentId,
      statusUrl,
    }).catch(() => {});
  }

  return NextResponse.json({ ...(result as object), message: "Appointment request submitted successfully" });
}
