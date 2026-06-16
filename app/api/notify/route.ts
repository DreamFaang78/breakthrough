import { NextRequest, NextResponse } from "next/server";
import { notify } from "@/lib/notify";
import type { NotifyEvent, NotifyPayload } from "@/lib/notify/templates";

/**
 * POST /api/notify
 * Internal-only endpoint — called server-side after booking/status changes.
 * Guarded by NOTIFY_SECRET so it cannot be triggered from the browser.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  if (secret && request.headers.get("x-notify-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event: NotifyEvent; payload: NotifyPayload };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.event || !body.payload) {
    return NextResponse.json({ error: "Missing event or payload" }, { status: 400 });
  }

  await notify(body.event, body.payload);
  return NextResponse.json({ ok: true });
}
