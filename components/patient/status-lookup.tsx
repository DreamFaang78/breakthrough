"use client";

import { useState } from "react";
import { Phone, MessageCircle, Navigation, Calendar, Clock, AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";

// ---- Status styling map ----
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; hinglish: string }> = {
  pending: {
    label: "Pending",
    hinglish: "Pending hai",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Clock className="size-4" />,
  },
  approved: {
    label: "Confirmed ✓",
    hinglish: "Confirm ho gayi",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <CheckCircle2 className="size-4" />,
  },
  rescheduled: {
    label: "Rescheduled",
    hinglish: "Reschedule hui",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: <Calendar className="size-4" />,
  },
  rejected: {
    label: "Not Available",
    hinglish: "Available nahi",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <XCircle className="size-4" />,
  },
  arrived: {
    label: "Arrived",
    hinglish: "Aa gaye",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <CheckCircle2 className="size-4" />,
  },
  in_consultation: {
    label: "In Consultation",
    hinglish: "Doctor se baat chal rahi hai",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <AlertCircle className="size-4" />,
  },
  completed: {
    label: "Completed ✓",
    hinglish: "Ho gayi",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle2 className="size-4" />,
  },
  no_show: {
    label: "Missed",
    hinglish: "Nahi aaye",
    color: "bg-red-50 text-red-600 border-red-100",
    icon: <XCircle className="size-4" />,
  },
  cancelled: {
    label: "Cancelled",
    hinglish: "Cancel hui",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <XCircle className="size-4" />,
  },
  follow_up_required: {
    label: "Follow-up Required",
    hinglish: "Follow-up chahiye",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    icon: <Calendar className="size-4" />,
  },
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ---- Appointment card ----
interface Appointment {
  id: string;
  status: string;
  preferred_date: string | null;
  preferred_slot: string | null;
  confirmed_date: string | null;
  confirmed_time: string | null;
  token_number: number | null;
  doctor_name: string | null;
  department_name: string | null;
  follow_up_date: string | null;
}

function AppointmentCard({
  appt,
  hospital,
}: {
  appt: Appointment;
  hospital: { name: string; phone: string | null; whatsapp: string | null; google_maps_url: string | null };
}) {
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
  const displayDate = appt.confirmed_date ?? appt.preferred_date;
  const displayTime = appt.confirmed_time ? formatTime(appt.confirmed_time) : appt.preferred_slot;
  const waNumber = hospital.whatsapp?.replace(/\D/g, "");
  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=Namaste%2C+mujhe+appointment+${appt.id.slice(0, 8)}+ke+baare+mein+poochna+tha.`
    : null;

  const isActive = ["approved", "arrived", "in_consultation", "rescheduled"].includes(appt.status);
  const canCancel = ["pending", "approved", "rescheduled"].includes(appt.status);

  return (
    <div className={`rounded-3xl border bg-card overflow-hidden ${isActive ? "border-primary/30 shadow-md shadow-primary/5" : ""}`}>
      {/* Status bar */}
      <div className={`flex items-center gap-2 border-b px-5 py-3 ${cfg.color}`}>
        {cfg.icon}
        <span className="text-sm font-semibold">{cfg.label}</span>
        <span className="text-xs opacity-75">· {cfg.hinglish}</span>
        {appt.token_number && (
          <span className="ml-auto rounded-full bg-white/60 px-2.5 py-0.5 text-xs font-bold">
            Token #{appt.token_number}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Doctor + Dept */}
        <div>
          {appt.doctor_name && (
            <p className="font-semibold">{appt.doctor_name}</p>
          )}
          {appt.department_name && (
            <p className="text-sm text-muted-foreground">{appt.department_name}</p>
          )}
        </div>

        {/* Date + Time */}
        {displayDate && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="mt-0.5 text-sm font-semibold">{formatDate(displayDate)}</p>
              {appt.confirmed_date && appt.confirmed_date !== appt.preferred_date && (
                <p className="text-xs text-muted-foreground line-through">{formatDate(appt.preferred_date)}</p>
              )}
            </div>
            {displayTime && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="mt-0.5 text-sm font-semibold">{displayTime}</p>
              </div>
            )}
          </div>
        )}

        {/* Arrival instruction */}
        {isActive && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <p className="font-medium">Kripya 15 minute pehle aayein.</p>
            <p className="text-xs opacity-80">Please arrive 15 minutes before your appointment.</p>
          </div>
        )}

        {/* Follow-up date */}
        {appt.follow_up_date && (
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
            Follow-up scheduled: {formatDate(appt.follow_up_date)}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {hospital.phone && (
            <a
              href={`tel:${hospital.phone}`}
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Phone className="size-4 text-primary" /> Call Hospital
            </a>
          )}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors"
            >
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </a>
          )}
          {hospital.google_maps_url && (
            <a
              href={hospital.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Navigation className="size-4 text-primary" /> Get Directions
            </a>
          )}
          {canCancel && waUrl && (
            <a
              href={`https://wa.me/${waNumber}?text=Namaste%2C+meri+appointment+${appt.id.slice(0, 8)}+cancel/reschedule+karni+hai.`}
              target="_blank"
              rel="noreferrer"
              className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              Request reschedule or cancel →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main lookup component ----
interface HospitalInfo {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  google_maps_url: string | null;
}

export function StatusLookup({
  hospital,
  initialPhone,
}: {
  hospital: HospitalInfo;
  initialPhone?: string;
}) {
  const [phone, setPhone] = useState(() => (initialPhone ?? "").replace(/\D/g, "").slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<{
    found: boolean;
    patient_name?: string;
    appointments?: Appointment[];
  } | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError(null);
    setPatientData(null);

    try {
      const res = await fetch(
        `/api/status?phone=${encodeURIComponent(cleaned)}&hospital_id=${encodeURIComponent(hospital.id)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setPatientData(data);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const waNumber = hospital.whatsapp?.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      {/* Lookup form */}
      {!patientData && (
        <form onSubmit={handleLookup} className="rounded-3xl border bg-card p-6 md:p-8">
          <h2 className="text-lg font-semibold">Enter your phone number</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the same number you gave when booking. / Wahi number jo aapne booking mein diya tha.
          </p>

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border bg-background py-3 pl-12 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Check →"}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
        </form>
      )}

      {/* Results */}
      {patientData && (
        <div className="space-y-4 animate-fade-in">
          {!patientData.found || !patientData.appointments?.length ? (
            <div className="rounded-3xl border bg-card p-8 text-center">
              <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-semibold">Koi appointment nahi mila.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No appointment found for {phone}. Make sure you&apos;re using the same number you booked with.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => { setPatientData(null); setPhone(""); }}
                  className="rounded-xl border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Try Again
                </button>
                <a
                  href="/book"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Book Now
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  {patientData.patient_name && (
                    <p className="font-semibold">Hello, {patientData.patient_name}!</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {patientData.appointments.length} appointment{patientData.appointments.length > 1 ? "s" : ""} found
                  </p>
                </div>
                <button
                  onClick={() => { setPatientData(null); setPhone(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Search again
                </button>
              </div>
              {patientData.appointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  hospital={hospital}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Fallback contact */}
      <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
        <p>Koi problem hai? Contact us:</p>
        <div className="mt-2 flex justify-center gap-4">
          {hospital.phone && (
            <a href={`tel:${hospital.phone}`} className="font-medium text-primary hover:underline">
              📞 Call us
            </a>
          )}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=Namaste%2C+mujhe+appointment+status+check+karni+hai.`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-green-700 hover:underline"
            >
              💬 WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
