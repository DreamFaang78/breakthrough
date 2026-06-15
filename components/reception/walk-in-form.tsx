"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { walkInSchema, type WalkInFormInput, type WalkInFormValues } from "@/lib/validation/walk-in";

type Department = { id: string; name: string };
type Doctor = { id: string; name: string; department_id: string | null };

interface Props {
  departments: Department[];
  doctors: Doctor[];
}

interface WalkInResult {
  appointment_id: string;
  patient_id: string;
  token_number: number;
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

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

export function WalkInForm({ departments, doctors }: Props) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<WalkInResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<WalkInFormInput, unknown, WalkInFormValues>({
    resolver: zodResolver(walkInSchema),
    defaultValues: { department_id: "", doctor_id: "" },
  });

  const selectedDeptId = watch("department_id");
  const filteredDoctors = doctors.filter((d) => !selectedDeptId || d.department_id === selectedDeptId);

  const onSubmit = async (data: WalkInFormValues) => {
    setSubmitting(true);
    setServerError(null);

    const { data: rpcResult, error } = await supabase.rpc("add_walk_in", {
      payload: {
        department_id: data.department_id,
        doctor_id: data.doctor_id || null,
        name: data.name,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        city_area: data.city_area || null,
        problem: data.problem || null,
      },
    });

    if (error) {
      setServerError(error.message);
      setSubmitting(false);
      return;
    }

    setResult(rpcResult as WalkInResult);
    setSubmitting(false);
  };

  if (result) {
    return (
      <div className="animate-scale-in rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-green-900">Walk-in added</h2>
        <p className="mt-4 rounded-2xl border border-green-200 bg-white px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Token Number</span>
          <span className="mt-1 block text-3xl font-bold">#{result.token_number}</span>
        </p>
        <button
          onClick={() => {
            setResult(null);
            reset();
          }}
          className="mt-6 w-full rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Add Another Walk-in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <FieldLabel required>Department</FieldLabel>
        <SelectBase {...register("department_id")} className="mt-1.5">
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </SelectBase>
        <FieldError message={errors.department_id?.message} />
      </div>

      <div>
        <FieldLabel>Doctor (optional)</FieldLabel>
        <SelectBase {...register("doctor_id")} className="mt-1.5" disabled={filteredDoctors.length === 0}>
          <option value="">Any available doctor</option>
          {filteredDoctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </SelectBase>
      </div>

      <div>
        <FieldLabel required>Patient Name</FieldLabel>
        <InputBase {...register("name")} placeholder="Full name" className="mt-1.5" />
        <FieldError message={errors.name?.message} />
      </div>

      <div>
        <FieldLabel required>Phone Number</FieldLabel>
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Age</FieldLabel>
          <InputBase {...register("age")} type="number" inputMode="numeric" min={0} max={120} placeholder="Years" className="mt-1.5" />
          <FieldError message={errors.age?.message} />
        </div>
        <div>
          <FieldLabel required>Gender</FieldLabel>
          <SelectBase {...register("gender")} className="mt-1.5">
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </SelectBase>
          <FieldError message={errors.gender?.message} />
        </div>
      </div>

      <div>
        <FieldLabel>City / Area (optional)</FieldLabel>
        <InputBase {...register("city_area")} placeholder="e.g. Civil Lines, Kanpur" className="mt-1.5" />
      </div>

      <div>
        <FieldLabel>Problem / Symptoms (optional)</FieldLabel>
        <textarea
          {...register("problem")}
          rows={3}
          placeholder="Briefly describe the problem..."
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
        />
      </div>

      {serverError && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Adding...
          </span>
        ) : (
          "Add Walk-in & Issue Token"
        )}
      </button>
    </form>
  );
}
