import { z } from "zod";

/**
 * Booking form Zod schema — PRD §17.
 * Reused on both client (RHF validation) and server (API route).
 */
export const bookingSchema = z.object({
  hospital_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
  department_id: z.string().uuid({ message: "Please select a department" }),
  doctor_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["opd", "follow_up", "emergency"]).default("opd"),
  preferred_date: z
    .string()
    .min(1, "Please select a date")
    .refine((d) => new Date(d) >= new Date(new Date().toDateString()), {
      message: "Date cannot be in the past",
    }),
  preferred_slot: z.string().min(1, "Please select a time slot"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  age: z.coerce
    .number({ error: "Enter a valid age" })
    .int()
    .min(0, "Age must be 0 or above")
    .max(120, "Enter a valid age"),
  gender: z.enum(["Male", "Female", "Other"], {
    error: "Please select a gender",
  }),
  city_area: z.string().optional(),
  problem: z.string().optional(),
  consent: z.literal(true, {
    error: "You must agree to be contacted",
  }),
  // Honeypot — must remain empty
  _hp: z.string().max(0).optional(),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
export type BookingFormInput = z.input<typeof bookingSchema>;

export const TIME_SLOTS = [
  { value: "Morning (9:00 AM – 12:00 PM)", label: "Morning · 9:00 AM – 12:00 PM" },
  { value: "Afternoon (12:00 PM – 4:00 PM)", label: "Afternoon · 12:00 PM – 4:00 PM" },
  { value: "Evening (4:00 PM – 8:00 PM)", label: "Evening · 4:00 PM – 8:00 PM" },
];
