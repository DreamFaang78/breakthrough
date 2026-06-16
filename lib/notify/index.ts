import "server-only";

import { createClient } from "@/lib/supabase/server";
import { buildEmailTemplate, type NotifyEvent, type NotifyPayload } from "./templates";

/**
 * Single notify() entry point — PILLAR P2-A.
 *
 * Channels (in order, gracefully skipped if unconfigured):
 *   1. Insert into notifications table (always — drives the in-app bell)
 *   2. Send email via Resend REST API (if RESEND_API_KEY is set)
 *
 * Never throws — logs errors and continues so a notification failure
 * never breaks the booking or status flow.
 */
export async function notify(event: NotifyEvent, payload: NotifyPayload): Promise<void> {
  await Promise.allSettled([
    insertNotification(event, payload),
    sendEmail(event, payload),
  ]);
}

// ---- In-app notification (notifications table) ----

const NOTIFICATION_TITLES: Record<NotifyEvent, string> = {
  new_request: "New appointment request",
  appointment_approved: "Appointment confirmed",
  reschedule_request: "Patient requested reschedule",
  cancellation_request: "Patient requested cancellation",
  follow_up_due: "Follow-up due",
};

async function insertNotification(event: NotifyEvent, payload: NotifyPayload) {
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert({
      hospital_id: payload.hospitalId,
      type: event,
      title: NOTIFICATION_TITLES[event] ?? event,
      body: [payload.patientName, payload.departmentName, payload.preferredDate]
        .filter(Boolean)
        .join(" · "),
      entity_type: "appointment",
      entity_id: payload.appointmentId ?? undefined,
      target_role: event === "new_request" ? "receptionist" : undefined,
      is_read: false,
    });
  } catch (err) {
    console.error("[notify] insertNotification failed:", err);
  }
}

// ---- Email via Resend REST API (no SDK dependency) ----

async function sendEmail(event: NotifyEvent, payload: NotifyPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "notifications@hospitalos.app";

  // Determine recipient: hospital staff email for requests, patient email not available in MVP
  const to = payload.notificationEmail;
  if (!apiKey || !to) return; // silently skip — not configured

  try {
    const { subject, html } = buildEmailTemplate(event, payload);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[notify] Resend error:", res.status, body);
    }
  } catch (err) {
    console.error("[notify] sendEmail failed:", err);
  }
}
