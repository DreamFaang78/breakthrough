import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/status?phone=&hospital_id=
 * Anon-callable: calls get_patient_status RPC (PRD §30).
 * Never returns raw patient/appointment rows — only what the RPC exposes.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const phone = searchParams.get("phone")?.replace(/\D/g, "");
  const hospitalId = searchParams.get("hospital_id");

  if (!phone || phone.length !== 10) {
    return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
  }
  if (!hospitalId) {
    return NextResponse.json({ error: "Hospital not specified" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_patient_status", {
    p_phone: phone,
    p_hospital_id: hospitalId,
    p_ref: null,
  });

  if (error) {
    console.error("[status] RPC error:", error.message);
    return NextResponse.json({ error: "Could not fetch status. Please try again." }, { status: 500 });
  }

  return NextResponse.json(data);
}
