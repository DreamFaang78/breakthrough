/**
 * Bilingual notification templates.
 * All patient-facing copy is Hinglish + English.
 * Staff-facing emails are simple English.
 */

export type NotifyEvent =
  | "new_request"
  | "appointment_approved"
  | "reschedule_request"
  | "cancellation_request"
  | "follow_up_due"
  | "owner_digest";

export interface NotifyPayload {
  hospitalName: string;
  hospitalId: string;
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  departmentName?: string;
  preferredDate?: string;
  preferredSlot?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  appointmentId?: string;
  notificationEmail?: string;
  action?: string; // reschedule | cancel
  reason?: string;
  rebookUrl?: string;
  digestStats?: {
    completed: number;
    total_requests: number;
    no_show: number;
    walk_in: number;
    pending_requests: number;
    pending_leads: number;
    yesterday: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });
}

export function buildEmailTemplate(event: NotifyEvent, p: NotifyPayload): EmailTemplate {
  const ref = p.appointmentId?.slice(0, 8).toUpperCase() ?? "";

  switch (event) {
    case "new_request":
      return {
        subject: `[${p.hospitalName}] New Appointment Request — ${p.patientName ?? "Patient"}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">New Appointment Request</h2>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">${p.hospitalName}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b">Patient</td><td style="padding:6px 0;font-weight:600">${p.patientName ?? "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0">${p.patientPhone ?? "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Department</td><td style="padding:6px 0">${p.departmentName ?? "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Preferred Date</td><td style="padding:6px 0">${formatDate(p.preferredDate)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Preferred Slot</td><td style="padding:6px 0">${p.preferredSlot ?? "—"}</td></tr>
      ${ref ? `<tr><td style="padding:6px 0;color:#64748b">Ref</td><td style="padding:6px 0;font-family:monospace">#${ref}</td></tr>` : ""}
    </table>
    <a href="/reception" style="display:inline-block;margin-top:20px;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open Reception Dashboard →</a>
  </div>
</div>`,
      };

    case "appointment_approved":
      return {
        subject: `[${p.hospitalName}] Aapki appointment confirm ho gayi! / Appointment Confirmed`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#16a34a;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">✅ Appointment Confirmed</h2>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px">${p.hospitalName}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:15px;margin:0 0 16px">Namaste <strong>${p.patientName ?? ""}</strong>,<br>Aapki appointment confirm ho gayi hai. / Your appointment has been confirmed.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${p.doctorName ? `<tr><td style="padding:6px 0;color:#64748b">Doctor</td><td style="padding:6px 0;font-weight:600">${p.doctorName}</td></tr>` : ""}
      ${p.departmentName ? `<tr><td style="padding:6px 0;color:#64748b">Department</td><td style="padding:6px 0">${p.departmentName}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;font-weight:600">${formatDate(p.confirmedDate ?? p.preferredDate)}</td></tr>
      ${p.confirmedTime ? `<tr><td style="padding:6px 0;color:#64748b">Time</td><td style="padding:6px 0;font-weight:600">${p.confirmedTime}</td></tr>` : ""}
    </table>
    <div style="margin:20px 0;background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;border-radius:8px;font-size:13px;color:#166534">
      Kripya 15 minute pehle aayein. / Please arrive 15 minutes before your appointment.
    </div>
    ${ref ? `<p style="font-size:12px;color:#94a3b8">Reference: #${ref}</p>` : ""}
  </div>
</div>`,
      };

    case "reschedule_request":
      return {
        subject: `[${p.hospitalName}] Patient requested reschedule — ${p.patientName ?? "Patient"}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#d97706;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">🔄 Reschedule Request</h2>
    <p style="color:#fde68a;margin:4px 0 0;font-size:13px">${p.hospitalName}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:14px"><strong>${p.patientName ?? "Patient"}</strong> (${p.patientPhone ?? ""}) has requested to reschedule their appointment${ref ? ` (#${ref})` : ""}.</p>
    ${p.reason ? `<p style="font-size:14px;color:#64748b">Reason: ${p.reason}</p>` : ""}
    <a href="/reception" style="display:inline-block;margin-top:16px;background:#d97706;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Handle in Dashboard →</a>
  </div>
</div>`,
      };

    case "cancellation_request":
      return {
        subject: `[${p.hospitalName}] Patient requested cancellation — ${p.patientName ?? "Patient"}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#dc2626;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">❌ Cancellation Request</h2>
    <p style="color:#fecaca;margin:4px 0 0;font-size:13px">${p.hospitalName}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:14px"><strong>${p.patientName ?? "Patient"}</strong> (${p.patientPhone ?? ""}) has requested to cancel their appointment${ref ? ` (#${ref})` : ""}.</p>
    ${p.reason ? `<p style="font-size:14px;color:#64748b">Reason: ${p.reason}</p>` : ""}
    <a href="/reception" style="display:inline-block;margin-top:16px;background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Handle in Dashboard →</a>
  </div>
</div>`,
      };

    case "follow_up_due":
      return {
        subject: `[${p.hospitalName}] Follow-up due — ${p.patientName ?? "Patient"}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#0d9488;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">📅 Follow-up Due</h2>
    <p style="color:#99f6e4;margin:4px 0 0;font-size:13px">${p.hospitalName}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:14px">Namaste <strong>${p.patientName ?? "Patient"}</strong>,<br>Aapka follow-up due hai. / Your follow-up appointment is due.</p>
    ${p.doctorName ? `<p style="font-size:14px;color:#475569">Doctor: <strong>${p.doctorName}</strong></p>` : ""}
    ${p.rebookUrl ? `<a href="${p.rebookUrl}" style="display:inline-block;margin-top:16px;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Book Follow-up Appointment →</a>` : ""}
    <p style="margin-top:20px;font-size:12px;color:#94a3b8">Phone: ${p.patientPhone ?? "—"}</p>
  </div>
</div>`,
      };

    case "owner_digest": {
      const s = p.digestStats;
      const dateLabel = s?.yesterday
        ? new Date(s.yesterday).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
        : "Yesterday";
      return {
        subject: `[${p.hospitalName}] Morning Digest — ${dateLabel}`,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#1e40af;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">🌅 Good Morning — Daily Digest</h2>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">${p.hospitalName} · ${dateLabel}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:0 0 12px">Yesterday&apos;s OPD</h3>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">✅ Completed</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#16a34a">${s?.completed ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">📋 Total Requests</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${s?.total_requests ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">🚶 Walk-ins</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${s?.walk_in ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:8px 0">❌ No-shows</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;color:${(s?.no_show ?? 0) > 0 ? "#dc2626" : "#111"}">${s?.no_show ?? 0}</td>
      </tr>
    </table>

    <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 12px">Right Now</h3>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">🔔 Pending Requests</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${(s?.pending_requests ?? 0) > 0 ? "#d97706" : "#111"}">${s?.pending_requests ?? 0}</td>
      </tr>
      <tr>
        <td style="padding:8px 0">📞 Open Leads</td>
        <td style="padding:8px 0;text-align:right;font-weight:700">${s?.pending_leads ?? 0}</td>
      </tr>
    </table>

    <div style="margin-top:24px;display:flex;gap:12px">
      <a href="/reception" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Open Reception →</a>
      <a href="/admin/analytics" style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Analytics →</a>
    </div>
  </div>
</div>`,
      };
    }

    default:
      return { subject: `[${p.hospitalName}] Notification`, html: `<p>Event: ${event}</p>` };
  }
}
