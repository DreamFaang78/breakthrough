/**
 * Builds a pre-filled /book URL for follow-up reminders and rebook flows.
 * Passing these params to the booking form skips re-entry of known info.
 */
export function buildRebookUrl(
  origin: string,
  opts: { phone?: string; departmentId?: string; doctorId?: string }
): string {
  const params = new URLSearchParams();
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.departmentId) params.set("department_id", opts.departmentId);
  if (opts.doctorId) params.set("doctor_id", opts.doctorId);
  const qs = params.toString();
  return `${origin}/book${qs ? `?${qs}` : ""}`;
}
