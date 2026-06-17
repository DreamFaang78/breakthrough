"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  bookingSchema,
  type BookingFormValues,
  type BookingFormInput,
  TIME_SLOTS,
} from "@/lib/validation/booking";
import {
  CheckCircle2,
  Loader2,
  ChevronDown,
  Stethoscope,
  UserRound,
  CalendarDays,
  Clock3,
  Phone,
  MapPin,
  FileText,
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Copy,
  Check,
  Sparkles,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";

type Department = { id: string; name: string };
type Doctor = { id: string; name: string; department_id: string; qualification: string | null };

interface Props {
  hospitalId: string;
  hospitalName?: string;
  departments: Department[];
  doctors: Doctor[];
  phone?: string | null;
  defaultDepartmentId?: string;
  defaultDoctorId?: string;
}

interface BookingResult {
  appointment_id: string;
  patient_phone: string;
  patient_name: string;
  department_name?: string;
  doctor_name?: string;
  preferred_date: string;
  preferred_slot: string;
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---- Sub-components ----

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function InputBase({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function SelectBase({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-xl border bg-background px-4 py-3 text-sm text-foreground",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  );
}

// ---- Confirmation screen — premium "Appointment Pass" ----

function formatPrettyDate(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });
}

function BookingConfirmation({
  result,
  hospitalName,
}: {
  result: BookingResult;
  hospitalName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const statusUrl = `/status?phone=${encodeURIComponent(result.patient_phone)}`;
  const ref = result.appointment_id.slice(0, 8).toUpperCase();
  const firstName = result.patient_name?.trim().split(/\s+/)[0] ?? "";

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const details = [
    { icon: Stethoscope, label: "Department", value: result.department_name ?? "—" },
    { icon: UserRound, label: "Doctor", value: result.doctor_name ?? "To be assigned" },
    { icon: CalendarDays, label: "Preferred date", value: formatPrettyDate(result.preferred_date) },
    { icon: Clock3, label: "Preferred time", value: result.preferred_slot || "—" },
  ];

  const steps = [
    { title: "Request received", sub: "Abhi • just now", state: "done" as const },
    { title: "We confirm your slot", sub: "Kuch ghanton mein • we'll call / WhatsApp you", state: "active" as const },
    { title: "Visit & meet the doctor", sub: "Apni report saath laayein • bring your reports", state: "todo" as const },
  ];

  const checklist = [
    { icon: IdCard, en: "A valid photo ID", hi: "Pehchaan patra (ID)" },
    { icon: FileText, en: "Past prescriptions & reports", hi: "Purani parchi & reports" },
    { icon: Clock3, en: "Arrive 15 minutes early", hi: "15 min pehle aayein" },
    { icon: BadgeCheck, en: "This reference number", hi: "Yeh reference number" },
  ];

  return (
    <div className="stagger space-y-5">
      {/* Success hero */}
      <div className="animate-fade-in-up text-center">
        <div className="relative mx-auto mb-3 flex size-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-green-500/10" style={{ animationDuration: "2.4s" }} />
          <span className="absolute inset-2 rounded-full bg-green-500/10" />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
            <CheckCircle2 className="size-9 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Request received</p>
        <h2 className="mt-1 flex items-center justify-center gap-2 text-2xl font-bold">
          Ho gaya{firstName ? `, ${firstName}` : ""}! <Sparkles className="size-5 text-amber-400" />
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Aapki appointment request mil gayi hai. We&apos;ll confirm your slot shortly.
        </p>
      </div>

      {/* The Appointment Pass */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-black/5">
        {/* Header strip */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-primary-foreground">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Appointment Pass</p>
            <p className="truncate text-sm font-bold">{hospitalName ?? "Your appointment"}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            ● Pending
          </span>
        </div>

        {/* Reference — tap to copy */}
        <div className="px-6 pb-4 pt-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reference</p>
          <button
            type="button"
            onClick={copyRef}
            className="group mx-auto mt-1 flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-muted"
          >
            <span className="font-mono text-2xl font-bold tracking-[0.15em]">{ref}</span>
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            )}
          </button>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {copied ? "Copied!" : "Tap to copy • screenshot this page to save"}
          </p>
        </div>

        {/* Perforation / tear line */}
        <div className="mx-6 border-t border-dashed border-border" />

        {/* Details stub */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 bg-muted/30 px-6 py-5">
          {details.map((d) => (
            <div key={d.label} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <d.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
                <p className="truncate text-sm font-semibold">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What happens next */}
      <div className="animate-fade-in-up rounded-2xl border bg-card p-5">
        <h3 className="mb-3 text-sm font-bold">Aage kya hoga / What happens next</h3>
        <ol>
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-white",
                    s.state === "done" && "bg-green-500",
                    s.state === "active" && "animate-pulse-border bg-primary",
                    s.state === "todo" && "border-2 border-border bg-background"
                  )}
                >
                  {s.state === "done" && <Check className="size-3.5" />}
                  {s.state === "active" && <div className="size-2 rounded-full bg-white" />}
                </div>
                {i < steps.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
              </div>
              <div className={cn(i === steps.length - 1 ? "pb-0" : "pb-4")}>
                <p className={cn("text-sm font-semibold", s.state === "todo" && "text-muted-foreground")}>{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* What to bring */}
      <div className="animate-fade-in-up rounded-2xl border bg-card p-5">
        <h3 className="mb-3 text-sm font-bold">Kya laana hai / What to bring</h3>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.en} className="flex items-center gap-2.5 rounded-xl border bg-background p-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <c.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.en}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.hi}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="animate-fade-in-up flex flex-col gap-2">
        <a
          href={statusUrl}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
        >
          Check Appointment Status <ArrowRight className="size-4" />
        </a>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-2xl border px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Book Another Appointment
        </button>
      </div>

      {/* Reassurance */}
      <p className="text-center text-xs text-muted-foreground">
        Confirmation nahi mila? <span className="font-medium text-foreground">Hum aapko call karenge.</span> No confirmation? We&apos;ll call you.
      </p>
    </div>
  );
}

// ---- Submitting animation screen ----

function SubmittingScreen() {
  const [phase, setPhase] = useState(0);
  const steps = ["Sending your details", "Reviewing appointment", "Almost done"] as const;

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => Math.min(p + 1, steps.length - 1)), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-14 animate-fade-in">
      {/* Concentric pulse rings */}
      <div className="relative flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "2.4s" }} />
        <span className="absolute inset-3 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "2.4s", animationDelay: "0.5s" }} />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
          <Loader2 className="size-7 animate-spin text-white" />
        </div>
      </div>

      {/* Headline + cycling sub-message */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Booking your appointment</h3>
        <p key={phase} className="mt-1.5 text-sm text-muted-foreground animate-fade-in">
          {steps[phase]}…
        </p>
      </div>

      {/* Auto-advancing step list */}
      <div className="flex w-56 flex-col gap-3">
        {steps.map((label, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2.5 text-xs transition-all duration-500",
              i <= phase ? "text-foreground" : "text-muted-foreground/40"
            )}
          >
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                i < phase
                  ? "bg-primary"
                  : i === phase
                  ? "border-2 border-primary"
                  : "border-2 border-border"
              )}
            >
              {i < phase && <BadgeCheck className="size-3 text-white" />}
              {i === phase && <div className="size-1.5 animate-pulse rounded-full bg-primary" />}
            </div>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Step indicator ----
function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
          done ? "bg-primary text-primary-foreground" : active ? "border-2 border-primary text-primary" : "border-2 border-border text-muted-foreground"
        )}
      >
        {done ? "✓" : null}
      </div>
      <span className={cn("text-xs", active || done ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

// ---- Main form ----

export function BookingForm({
  hospitalId,
  hospitalName,
  departments,
  doctors,
  phone,
  defaultDepartmentId,
  defaultDoctorId,
}: Props) {
  const [step, setStep] = useState(1); // 1 = appointment details, 2 = patient details
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Register global Turnstile callbacks (Turnstile calls these by name after render)
  useEffect(() => {
    if (!turnstileSiteKey) return;
    (window as unknown as Record<string, unknown>).onTurnstileSuccess = (token: string) =>
      setTurnstileToken(token);
    (window as unknown as Record<string, unknown>).onTurnstileExpired = () =>
      setTurnstileToken("");
    return () => {
      delete (window as unknown as Record<string, unknown>).onTurnstileSuccess;
      delete (window as unknown as Record<string, unknown>).onTurnstileExpired;
    };
  }, [turnstileSiteKey]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<BookingFormInput, unknown, BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      hospital_id: hospitalId,
      type: "opd",
      phone: phone ?? "",
      department_id: defaultDepartmentId ?? "",
      doctor_id: defaultDoctorId ?? "",
    },
  });

  const selectedDeptId = watch("department_id");
  const filteredDoctors = doctors.filter(
    (d) => !selectedDeptId || d.department_id === selectedDeptId
  );

  // When department changes, clear doctor selection (skip on initial mount)
  // Ensure hospital_id is set in RHF internal state (hidden inputs don't reliably
  // inherit defaultValues in RHF's uncontrolled mode — the DOM starts as "" on mount).
  useEffect(() => {
    setValue("hospital_id", hospitalId);
  }, [hospitalId, setValue]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setValue("doctor_id", "");
  }, [selectedDeptId, setValue]);

  const goToStep2 = async () => {
    const valid = await trigger(["department_id", "type", "preferred_date", "preferred_slot"]);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: BookingFormValues) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          hospital_id: hospitalId,
          cf_turnstile_response: turnstileToken || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        const msg = json.error ?? "Something went wrong. Please try again.";
        setServerError(msg);
        toast.error(msg);
        return;
      }

      const dept = departments.find((d) => d.id === data.department_id);
      const doc = data.doctor_id ? doctors.find((d) => d.id === data.doctor_id) : undefined;
      setResult({
        appointment_id: json.appointment_id,
        patient_phone: data.phone,
        patient_name: data.name,
        department_name: dept?.name,
        doctor_name: doc?.name,
        preferred_date: data.preferred_date,
        preferred_slot: data.preferred_slot,
      });
    } catch {
      const msg = "Network error. Please check your connection and try again.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  // Max date: 3 months out
  const maxDateStr = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (submitting) return <SubmittingScreen />;

  if (result) {
    return <BookingConfirmation result={result} hospitalName={hospitalName} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Honeypot */}
      <input {...register("_hp")} type="text" className="sr-only" tabIndex={-1} autoComplete="off" />
      <input type="hidden" {...register("hospital_id")} />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        <StepDot active={step === 1} done={step > 1} label="Appointment" />
        <div className="h-px w-12 bg-border" />
        <StepDot active={step === 2} done={false} label="Your Details" />
      </div>

      {/* ---- STEP 1: Appointment details ---- */}
      {/* NOTE: hidden via CSS (not unmounted) so RHF retains field values when on step 2 */}
      <div className={cn("space-y-5", step !== 1 && "hidden")}>
          {/* Department */}
          <div>
            <FieldLabel required><Stethoscope className="inline size-3.5 mr-1 text-muted-foreground" />Department</FieldLabel>
            <SelectBase {...register("department_id")} className="mt-1.5">
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectBase>
            <FieldError message={errors.department_id?.message} />
          </div>

          {/* Doctor */}
          <div>
            <FieldLabel><UserRound className="inline size-3.5 mr-1 text-muted-foreground" />Doctor (optional)</FieldLabel>
            <SelectBase {...register("doctor_id")} className="mt-1.5" disabled={filteredDoctors.length === 0}>
              <option value="">Any available doctor</option>
              {filteredDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.qualification ? ` — ${d.qualification}` : ""}
                </option>
              ))}
            </SelectBase>
          </div>

          {/* Type */}
          <div>
            <FieldLabel required><ClipboardList className="inline size-3.5 mr-1 text-muted-foreground" />Appointment Type</FieldLabel>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["opd", "follow_up", "emergency"] as const).map((type) => (
                <label
                  key={type}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors",
                    watch("type") === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <input {...register("type")} type="radio" value={type} className="sr-only" />
                  {type === "opd" ? "OPD" : type === "follow_up" ? "Follow-up" : "Emergency"}
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <FieldLabel required><CalendarDays className="inline size-3.5 mr-1 text-muted-foreground" />Preferred Date</FieldLabel>
            <InputBase
              {...register("preferred_date")}
              type="date"
              min={todayStr}
              max={maxDateStr}
              className="mt-1.5"
            />
            <FieldError message={errors.preferred_date?.message} />
          </div>

          {/* Time slot */}
          <div>
            <FieldLabel required><Clock3 className="inline size-3.5 mr-1 text-muted-foreground" />Preferred Time</FieldLabel>
            <div className="mt-1.5 space-y-2">
              {TIME_SLOTS.map((slot) => (
                <label
                  key={slot.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                    watch("preferred_slot") === slot.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <input
                    {...register("preferred_slot")}
                    type="radio"
                    value={slot.value}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border",
                      watch("preferred_slot") === slot.value ? "border-primary" : "border-border"
                    )}
                  >
                    {watch("preferred_slot") === slot.value && (
                      <div className="size-2 rounded-full bg-primary" />
                    )}
                  </div>
                  {slot.label}
                </label>
              ))}
            </div>
            <FieldError message={errors.preferred_slot?.message} />
          </div>

          <button
            type="button"
            onClick={goToStep2}
            className="w-full rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.99]"
          >
            Continue →
          </button>
      </div>

      {/* ---- STEP 2: Patient details ---- */}
      <div className={cn("space-y-5", step !== 2 && "hidden")}>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />Back to appointment details
          </button>

          {/* Name */}
          <div>
            <FieldLabel required><UserRound className="inline size-3.5 mr-1 text-muted-foreground" />Patient Name / Mareez ka Naam</FieldLabel>
            <InputBase {...register("name")} placeholder="Full name" className="mt-1.5" autoFocus />
            <FieldError message={errors.name?.message} />
          </div>

          {/* Phone */}
          <div>
            <FieldLabel required><Phone className="inline size-3.5 mr-1 text-muted-foreground" />Phone Number / Phone Nambhar</FieldLabel>
            <InputBase
              {...register("phone")}
              type="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10-digit mobile number"
              className="mt-1.5"
            />
            <FieldError message={errors.phone?.message} />
            <p className="mt-1 text-xs text-muted-foreground">Your status can be checked with this number</p>
          </div>

          {/* Email */}
          <div>
            <FieldLabel><FileText className="inline size-3.5 mr-1 text-muted-foreground" />Email (optional)</FieldLabel>
            <InputBase
              {...register("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-1.5"
            />
            <FieldError message={errors.email?.message} />
            <p className="mt-1 text-xs text-muted-foreground">Get booking updates on email / Email par updates payein</p>
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Age / Umar</FieldLabel>
              <InputBase
                {...register("age")}
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                placeholder="Years"
                className="mt-1.5"
              />
              <FieldError message={errors.age?.message} />
            </div>
            <div>
              <FieldLabel required>Gender</FieldLabel>
              <SelectBase {...register("gender")} className="mt-1.5">
                <option value="">Select</option>
                <option value="Male">Male / Purush</option>
                <option value="Female">Female / Mahila</option>
                <option value="Other">Other</option>
              </SelectBase>
              <FieldError message={errors.gender?.message} />
            </div>
          </div>

          {/* City */}
          <div>
            <FieldLabel><MapPin className="inline size-3.5 mr-1 text-muted-foreground" />City / Area (optional)</FieldLabel>
            <InputBase {...register("city_area")} placeholder="e.g. Civil Lines, Kanpur" className="mt-1.5" />
          </div>

          {/* Problem */}
          <div>
            <FieldLabel><FileText className="inline size-3.5 mr-1 text-muted-foreground" />Problem / Symptoms (optional)</FieldLabel>
            <textarea
              {...register("problem")}
              rows={3}
              placeholder="Briefly describe your problem..."
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
            />
          </div>

          {/* Consent */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-4">
            <input
              {...register("consent")}
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              I agree to be contacted regarding this appointment request. / Main is sambandh me contact kiye jaane ke liye sahmat hoon.
            </span>
          </label>
          <FieldError message={errors.consent?.message} />

          {/* Cloudflare Turnstile — renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set */}
          {turnstileSiteKey && (
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-callback="onTurnstileSuccess"
              data-expired-callback="onTurnstileExpired"
              data-theme="light"
            />
          )}

          {/* Server error */}
          {serverError && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={step !== 2 || submitting}
            className="w-full rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Submitting your request...
              </span>
            ) : (
              "Submit Appointment Request →"
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Your request will be reviewed and confirmed by our receptionist.
          </p>
      </div>
    </form>
  );
}
