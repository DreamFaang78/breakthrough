import { Phone, MessageCircle, CalendarPlus, Navigation } from "lucide-react";
import Link from "next/link";

interface Props {
  phone?: string | null;
  whatsapp?: string | null;
  googleMapsUrl?: string | null;
}

export function StickyCta({ phone, whatsapp, googleMapsUrl }: Props) {
  const waNumber = whatsapp?.replace(/\D/g, "");
  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=Namaste%2C+mujhe+appointment+chahiye.`
    : null;

  return (
    <>
      {/* Mobile bottom bar — 4 equal actions */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="grid grid-cols-4 border-t bg-background">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground hover:text-primary active:bg-muted transition-colors"
            >
              <Phone className="size-5" />
              Call
            </a>
          )}
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-[#25D366] active:bg-muted transition-colors"
            >
              <MessageCircle className="size-5" />
              WhatsApp
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground/40">
              <MessageCircle className="size-5" />
              WhatsApp
            </span>
          )}
          <Link
            href="/book"
            className="col-span-1 flex flex-col items-center gap-1 bg-primary py-3 text-[11px] font-semibold text-primary-foreground"
          >
            <CalendarPlus className="size-5" />
            Book
          </Link>
          {googleMapsUrl ? (
            <a
              href={googleMapsUrl}
              target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground hover:text-primary active:bg-muted transition-colors"
            >
              <Navigation className="size-5" />
              Directions
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground/40">
              <Navigation className="size-5" />
              Directions
            </span>
          )}
        </div>
      </div>

      {/* Desktop floating WhatsApp bubble */}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank" rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-6 right-6 z-50 hidden size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/20 transition-transform hover:scale-105 active:scale-95 md:flex animate-pulse-border"
        >
          <MessageCircle className="size-6" />
        </a>
      )}
    </>
  );
}
