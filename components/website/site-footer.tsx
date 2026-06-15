import Link from "next/link";
import { Phone, MapPin, MessageCircle, Clock } from "lucide-react";

type Hospital = {
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  emergency_phone?: string | null;
  google_maps_url?: string | null;
};

export function SiteFooter({ hospital }: { hospital: Hospital }) {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2">
            <p className="text-base font-semibold text-foreground">{hospital.name}</p>
            {(hospital.address || hospital.city) && (
              <div className="mt-2 flex gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span>{[hospital.address, hospital.city].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="size-3.5" /> {hospital.phone}
              </a>
            )}
            {hospital.whatsapp && (
              <a
                href={`https://wa.me/${hospital.whatsapp.replace(/\D/g, "")}?text=Namaste%2C+mujhe+appointment+chahiye.`}
                target="_blank" rel="noreferrer"
                className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            )}
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Links</p>
            <nav className="flex flex-col gap-2">
              {[
                { href: "/book", label: "Book Appointment" },
                { href: "/status", label: "Check Status" },
                { href: "/doctors", label: "Our Doctors" },
                { href: "/departments", label: "Departments" },
                { href: "/faq", label: "FAQ" },
                { href: "/login", label: "Staff Login" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Emergency */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emergency</p>
            {hospital.emergency_phone && (
              <a
                href={`tel:${hospital.emergency_phone}`}
                className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Phone className="size-4" />
                {hospital.emergency_phone}
              </a>
            )}
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" />
              <span>24 x 7 Emergency Services</span>
            </div>
            {hospital.google_maps_url && (
              <a
                href={hospital.google_maps_url}
                target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <MapPin className="size-3.5" /> Get Directions
              </a>
            )}
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          {`© ${new Date().getFullYear()} ${hospital.name}. All rights reserved.`}
        </div>
      </div>
    </footer>
  );
}
