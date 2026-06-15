import type { Metadata } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `FAQ | ${hospital?.name ?? ""}` };
}

const DEFAULT_FAQS = [
  {
    q: "How do I book an appointment?",
    a: "You can book online in under 30 seconds using our Book Appointment button. Select your department, preferred doctor, date and time, then fill in your details.",
  },
  {
    q: "What documents should I bring?",
    a: "Please bring a valid ID (Aadhaar/Voter ID), any previous prescriptions or reports related to your condition, and your insurance card if applicable.",
  },
  {
    q: "How will I know if my appointment is confirmed?",
    a: "Our receptionist will confirm your appointment within a few hours. You can also check your status anytime at our Status page using the phone number you used to book.",
  },
  {
    q: "Can I cancel or reschedule my appointment?",
    a: "Yes. Visit the Status page, enter your phone number, and tap Request Reschedule or Request Cancel. Our team will confirm the change.",
  },
  {
    q: "Is parking available?",
    a: "Yes, parking is available on the hospital premises. It is free for OPD patients.",
  },
  {
    q: "What are the OPD timings?",
    a: "OPD timings vary by doctor and department. Check each doctor's profile for their specific schedule. Emergency services are available 24 × 7.",
  },
  {
    q: "Do you accept health insurance?",
    a: "Please call the reception to confirm your insurance before your visit. We work with several major insurance providers.",
  },
  {
    q: "How early should I arrive for my appointment?",
    a: "Please arrive at least 15 minutes before your appointment time for registration formalities.",
  },
];

export default async function FaqPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Common questions</p>
        <h1 className="text-3xl font-bold md:text-4xl">Frequently Asked Questions</h1>
        <p className="mt-2 text-muted-foreground">Couldn&apos;t find your answer?{" "}
          {hospital.phone && <a href={`tel:${hospital.phone}`} className="text-primary hover:underline">Call us directly.</a>}
        </p>
      </div>

      <div className="space-y-3">
        {DEFAULT_FAQS.map((faq, i) => (
          <details key={i} className="group rounded-2xl border bg-card open:border-primary/30">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold list-none">
              {faq.q}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-3xl border border-primary/15 bg-primary/5 p-8 text-center">
        <p className="font-semibold">Still have questions?</p>
        <p className="mt-1 text-sm text-muted-foreground">Our team is here to help.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/book" className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Book Appointment
          </Link>
          {hospital.phone && (
            <a href={`tel:${hospital.phone}`} className="rounded-2xl border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
              Call Now
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
