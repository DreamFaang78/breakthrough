import "server-only";

/**
 * Normalize an Indian mobile number to WhatsApp format (digits, country code, no "+").
 * Patients are stored as 10-digit numbers; WhatsApp needs the 91 country code.
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits.length >= 12 ? digits : null;
}

/**
 * Provider seam — the ONE place to wire your WhatsApp provider.
 *
 * Inert until configured (mirrors sendEmail() skipping without RESEND_API_KEY),
 * so this ships safely today and goes live the moment you set the env vars.
 *
 * To wire a provider, set WHATSAPP_API_URL + WHATSAPP_TOKEN and adapt the body:
 *   - Meta Cloud API:
 *       WHATSAPP_API_URL = https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages
 *       The body below already matches Meta's shape for a session text message.
 *       (Business-initiated messages outside the 24h window need an approved
 *        template — swap type:"text" for type:"template" when you map templates.)
 *   - AiSensy / Interakt / Gupshup (Indian BSPs):
 *       Point WHATSAPP_API_URL at their send endpoint and replace the body with
 *       their template payload. These are usually the cheapest for Tier 2/3.
 */
export async function dispatchWhatsApp(to: string, message: string): Promise<void> {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  if (!url || !token) return; // not configured yet — graceful skip

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[notify] WhatsApp provider error:", res.status, body);
  }
}
