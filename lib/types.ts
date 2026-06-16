/**
 * Hand-written row shapes for queries that embed a related table
 * (e.g. `doctors(... , departments(name))`). Postgrest's select-string
 * type inference can't determine join cardinality when `Database` is the
 * `any` placeholder, so these casts keep page components type-safe until
 * generated types replace `types/supabase.ts`.
 */

export type DoctorWithDepartment = {
  id: string;
  name: string;
  slug: string;
  qualification: string | null;
  bio?: string | null;
  departments: { name: string } | null;
};

export type ServiceWithDepartment = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  departments: { name: string } | null;
};

export type DoctorDetail = {
  id: string;
  name: string;
  slug: string;
  qualification: string | null;
  bio: string | null;
  opd_days: string[] | null;
  opd_timings: Record<string, { start: string; end: string }> | null;
  consultation_fee: number | null;
  departments: { name: string; slug: string } | null;
};

export type AppointmentStatus =
  | "pending"
  | "approved"
  | "rescheduled"
  | "rejected"
  | "arrived"
  | "in_consultation"
  | "completed"
  | "no_show"
  | "cancelled"
  | "follow_up_required";

export type ReceptionAppointment = {
  id: string;
  status: AppointmentStatus;
  type: "opd" | "follow_up" | "emergency";
  source: string;
  is_walk_in: boolean;
  preferred_date: string;
  preferred_slot: string | null;
  confirmed_date: string | null;
  confirmed_time: string | null;
  token_number: number | null;
  problem: string | null;
  reject_reason: string | null;
  internal_notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  patients: { name: string; phone: string; age: number | null; gender: string | null } | null;
  doctors: { id: string; name: string } | null;
  departments: { id: string; name: string } | null;
  has_pending_request?: boolean;
};

export type DoctorAppointment = {
  id: string;
  status: AppointmentStatus;
  preferred_date: string;
  preferred_slot: string | null;
  confirmed_date: string | null;
  confirmed_time: string | null;
  token_number: number | null;
  problem: string | null;
  doctor_notes: string | null;
  follow_up_date: string | null;
  patients: { name: string; age: number | null; gender: string | null } | null;
  departments: { name: string } | null;
};

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  city_area: string | null;
  source: string;
  status: string;
  appointment_date: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  departments: { name: string } | null;
  doctors: { name: string } | null;
};

export type DepartmentOption = { id: string; name: string };

export type DoctorOption = { id: string; name: string; department_id: string | null };

export type AdminDepartmentRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type AdminDoctorRow = {
  id: string;
  name: string;
  slug: string;
  qualification: string | null;
  department_id: string | null;
  photo_url: string | null;
  bio: string | null;
  consultation_fee: number | null;
  is_active: boolean;
  departments: { name: string } | null;
};

export type AdminStaffRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  doctor_id: string | null;
  is_active: boolean;
  doctors: { name: string } | null;
};

export type AdminHospitalRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  emergency_phone: string | null;
  google_maps_url: string | null;
  about: string | null;
  default_language: string;
  notification_email: string | null;
};

export type AdminDoctorTimingsRow = {
  id: string;
  name: string;
  qualification: string | null;
  opd_days: string[];
  opd_timings: Record<string, { start: string; end: string }>;
  departments: { name: string } | null;
};

export type AdminServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  department_id: string | null;
  is_active: boolean;
  departments: { name: string } | null;
};
