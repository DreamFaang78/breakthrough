import type { Metadata } from "next";
import { getCurrentHospital } from "@/lib/tenant";
import { Phone, MessageCircle, MapPin, Mail, Clock } from "lucide-react";

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
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Get in touch</p>
        <h1 className="text-3xl font-bold md:text-4xl">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">We&apos;re here to help. Reach us any way you like.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          {hospital.phone && (
            <a href={`tel:${hospital.phone}`} className="flex items-start gap-4 rounded-2xl border bg-card p-5 hover:border-primary/30 transition-colors group">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
            <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-start gap-4 rounded-2xl border bg-card p-5 hover:border-green-300 transition-colors">
              <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
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
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="mt-0.5 font-semibold">{hospital.notification_email}</p>
              </div>
            </div>
          )}
          {hospital.address && (
            <div className="flex items-start gap-4 rounded-2xl border bg-card p-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</p>
                <p className="mt-0.5 font-semibold leading-relaxed">{hospital.address}</p>
                {hospital.google_maps_url && (
                  <a href={hospital.google_maps_url} target="_blank" rel="noreferrer" className="mt-1 text-xs text-primary hover:underline">Get Directions →</a>
                )}
              </div>
            </div>
          )}
          <div className="flex items-start gap-4 rounded-2xl border bg-card p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OPD Hours</p>
              <p className="mt-0.5 font-semibold">Mon – Sat: 10:00 AM – 6:00 PM</p>
              <p className="text-xs text-muted-foreground">Emergency: 24 × 7</p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="overflow-hidden rounded-3xl border aspect-square md:aspect-auto">
          {hospital.google_maps_url ? (
            <iframe
              src={hospital.google_maps_url + "&output=embed"}
              className="h-full w-full min-h-[300px]"
              loading="lazy"
              title="Hospital Map"
            />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center bg-muted text-sm text-muted-foreground">
              Map not configured
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
