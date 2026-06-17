import { z } from "zod";

/**
 * Walk-in patient form Zod schema — PRD §23.
 */
export const walkInSchema = z.object({
  department_id: z.string().uuid({ message: "Please select a department" }),
  doctor_id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
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
  city_area: z.string().max(100, "Area too long").optional(),
  problem: z.string().max(500, "Description too long (max 500 chars)").optional(),
});

export type WalkInFormValues = z.infer<typeof walkInSchema>;
export type WalkInFormInput = z.input<typeof walkInSchema>;
