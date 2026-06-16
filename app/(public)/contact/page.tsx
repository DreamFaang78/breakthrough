import type { Metadata } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import { Phone, MessageCircle, MapPin, Mail, Clock, Navigation } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const hospital = await getCurrentHospital();
  return { title: `Contact | ${hospital?.name ?? ""}` };
}

export default async function ContactPage() {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;

  const waNumber = hospital.whatsapp?.replace(/\D/g, "");
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=Namaste%2C+mujhe+appointment+chahiye.` : null;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-16">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Get in Touch</p>
          <h1 className="text-3xl font-bold md:text-4xl">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;re here to help — call, WhatsApp, or visit us directly.
          </p>
          {hospital.address && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              {hospital.address}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-16">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact methods */}
          <div className="space-y-3">
            {hospital.phone && (
              <a
                href={`tel:${hospital.phone}`}
                className="flex items-start gap-4 rounded-2xl border bg-card p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Phone className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
                  <p className="mt-0.5 font-semibold group-hover:text-primary transition-colors">{hospital.phone}</p>
                  <p className="text-xs text-muted-foreground">Tap to call directly</p>
                </div>
              </a>
            )}

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-4 rounded-2xl border bg-card p-5 hover:border-green-300 transition-colors group"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-green-100 text-green-700 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                  <p className="mt-0.5 font-semibold">Chat with us</p>
                  <p className="text-xs text-muted-foreground">Quick response on WhatsApp</p>
                </div>
              </a>
            )}

            {hospital.notification_email && (
              <div className="flex items-start gap-4 rounded-2xl border bg-card p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                  <p className="mt-0.5 font-semibold break-all">{hospital.notification_email}</p>
                </div>
              </div>
            )}

            {hospital.address && (
              <div className="flex items-start gap-4 rounded-2xl border bg-card p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</p>
                  <p className="mt-0.5 font-semibold leading-relaxed">{hospital.address}</p>
                  {hospital.google_maps_url && (
                    <a
                      href={hospital.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Navigation className="size-3" /> Get Directions
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 rounded-2xl border bg-card p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OPD Hours</p>
                <p className="mt-0.5 font-semibold">Mon – Sat: 10:00 AM – 6:00 PM</p>
                <p className="text-xs text-muted-foreground">Emergency: 24 × 7</p>
              </div>
            </div>

            {/* Book CTA */}
            <Link
              href="/book"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Book Appointment Online
            </Link>
          </div>

          {/* Map */}
          <div className="overflow-hidden rounded-3xl border bg-muted min-h-[360px]">
            {hospital.google_maps_url ? (
              <iframe
                src={hospital.google_maps_url.includes("output=embed") ? hospital.google_maps_url : hospital.google_maps_url + "&output=embed"}
                className="h-full w-full min-h-[360px]"
                loading="lazy"
                title="Hospital Map"
              />
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center p-8">
                <MapPin className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Map not configured yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
