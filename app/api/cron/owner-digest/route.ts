import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildOwnerDigest } from "@/lib/notify/digest";
import { notify } from "@/lib/notify";

/**
 * POST /api/cron/owner-digest
 * Sends yesterday's analytics digest email to each hospital's notification_email.
 * Trigger: Vercel Cron at 08:00 IST, or manually via POST with x-cron-secret header.
 * Set CRON_SECRET in env to guard this endpoint.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: hospitals, error } = await supabase
    .from("hospitals")
    .select("id")
    .order("created_at");

  if (error) {
    console.error("[owner-digest] Failed to fetch hospitals:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!hospitals?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const h of hospitals) {
    try {
      const digest = await buildOwnerDigest(h.id, supabase);
      if (!digest?.notificationEmail) continue;

      await notify("owner_digest", {
        hospitalId: digest.hospitalId,
        hospitalName: digest.hospitalName,
        notificationEmail: digest.notificationEmail,
        digestStats: digest.stats,
      });
      sent++;
    } catch (err) {
      errors.push(`${h.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, errors: errors.length ? errors : undefined });
}
