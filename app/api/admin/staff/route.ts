import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/staff
 * Owner-only: creates a staff auth account (receptionist or doctor login)
 * and links it to public.users. Requires the service-role client because
 * creating auth.users rows isn't possible via the anon/authenticated key.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner" || !profile.hospital_id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password, full_name, role, doctor_id } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Valid email and password (min 6 chars) are required." }, { status: 400 });
  }
  if (typeof full_name !== "string" || !full_name.trim()) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (role !== "receptionist" && role !== "doctor") {
    return NextResponse.json({ error: "Role must be receptionist or doctor." }, { status: 400 });
  }
  if (role === "doctor" && (typeof doctor_id !== "string" || !doctor_id)) {
    return NextResponse.json({ error: "Doctor must be selected for doctor accounts." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create account." }, { status: 400 });
  }

  const { error: profileError } = await admin.from("users").insert({
    id: created.user.id,
    hospital_id: profile.hospital_id,
    role,
    full_name: full_name.trim(),
    email: email.trim(),
    doctor_id: role === "doctor" ? (doctor_id as string) : null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
