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
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";

type Department = { id: string; name: string };
type Doctor = { id: string; name: string; department_id: string; qualification: string | null };

interface Props {
  hospitalId: string;
  departments: Department[];
  doctors: Doctor[];
  phone?: string | null;
  defaultDepartmentId?: string;
  defaultDoctorId?: string;
}

interface BookingResult {
  appointment_id: string;
  patient_phone: string;
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

// ---- Confirmation screen ----

function BookingConfirmation({ result, phone }: { result: BookingResult; phone: string }) {
  const statusUrl = `/status?phone=${encodeURIComponent(phone)}`;

  return (
    <div className="animate-scale-in rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-green-900">Aapki request mil gayi hai!</h2>
      <p className="mt-1 text-sm text-green-700">We&apos;ve received your request. We&apos;ll confirm shortly.</p>

      <div className="mt-6 rounded-2xl border border-green-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference</p>
        <p className="mt-1 font-mono text-sm font-medium">{result.appointment_id.slice(0, 8).toUpperCase()}</p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <a
          href={statusUrl}
          className="w-full rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Check Appointment Status
        </a>
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-2xl border px-6 py-3.5 text-sm font-semibold hover:bg-muted transition-colors"
        >
          Book Another Appointment
        </button>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        Status updates at{" "}
        <a href={statusUrl} className="text-primary hover:underline font-medium">
          {typeof window !== "undefined" ? window.location.origin : ""}/status
        </a>
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
        body: JSON.stringify({ ...data, hospital_id: hospitalId }),
      });
      const json = await res.json();

      if (!res.ok) {
        const msg = json.error ?? "Something went wrong. Please try again.";
        setServerError(msg);
        toast.error(msg);
        return;
      }

      setResult({ appointment_id: json.appointment_id, patient_phone: data.phone });
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
    return <BookingConfirmation result={result} phone={result.patient_phone} />;
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
