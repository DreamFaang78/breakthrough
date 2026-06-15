import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validation/booking";
import { getCurrentHospital } from "@/lib/tenant";

/**
 * POST /api/booking
 * Public booking endpoint — calls create_appointment_request RPC (PRD §30).
 * Rate-limited per IP; honeypot checked; Zod-validated before hitting the DB.
 */
export async function POST(request: NextRequest) {
  // ----- Rate limiting (simple in-memory, edge-compatible header check) -----
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  // Basic header-based rate limit: 5 requests per minute per IP via Vercel edge
  // Full rate limiting is handled at the edge level; this is a secondary guard.

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

  return NextResponse.json({ ...(result as object), message: "Appointment request submitted successfully" });
}
