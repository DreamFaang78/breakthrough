import { NextResponse } from "next/server";

/**
 * Notification dispatch endpoint (email/WhatsApp). Implemented in the
 * notifications/polish phase.
 */
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
