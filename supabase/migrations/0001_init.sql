-- ============================================================
-- 0001_init.sql
-- Hospital OS - core schema, enums, indexes, RLS
-- PRD Sections 27 (DB structure), 28 (tables), 29 (RLS)
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- ENUM TYPES (Section 27)
-- ============================================================

create type user_role as enum ('super_admin','owner','receptionist','doctor','patient');

create type appointment_status as enum (
  'pending','approved','rescheduled','rejected','arrived','in_consultation',
  'completed','no_show','cancelled','follow_up_required'
);

create type appointment_type as enum ('opd','follow_up','emergency');

create type lead_source as enum (
  'website','phone_call','whatsapp','google_maps','instagram','facebook',
  'walk_in','referral','other'
);

create type lead_status as enum (
  'new','contacted','appointment_booked','visited','not_interested',
  'follow_up_required','converted','lost'
);

-- ============================================================
-- updated_at TRIGGER HELPER
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABLES (Section 28)
-- ============================================================

-- ---------- hospitals (tenant root) ----------
create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  address text,
  city text,
  phone text,
  whatsapp text,
  emergency_phone text,
  google_maps_url text,
  about text,
  default_language text not null default 'hinglish',
  notification_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_hospitals_city on hospitals (city);

-- ---------- departments ----------
create table departments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  name text not null,
  slug text not null,
  icon text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hospital_id, slug)
);
create index idx_departments_hospital on departments (hospital_id);

-- ---------- doctors ----------
create table doctors (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  name text not null,
  slug text not null,
  qualification text,
  department_id uuid references departments(id) on delete set null,
  photo_url text,
  bio text,
  opd_days jsonb not null default '[]'::jsonb,
  opd_timings jsonb not null default '{}'::jsonb,
  consultation_fee numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hospital_id, slug)
);
create index idx_doctors_hospital on doctors (hospital_id);
create index idx_doctors_department on doctors (department_id);

-- ---------- users (staff profiles; 1:1 with auth.users) ----------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  hospital_id uuid references hospitals(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text,
  phone text,
  doctor_id uuid references doctors(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_users_hospital on users (hospital_id);
create index idx_users_role on users (role);
create index idx_users_doctor on users (doctor_id);

-- ---------- services ----------
create table services (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  department_id uuid references departments(id) on delete set null,
  name text not null,
  description text,
  price numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_services_hospital on services (hospital_id);
create index idx_services_department on services (department_id);

-- ---------- patients ----------
create table patients (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  name text not null,
  phone text not null,
  age int,
  gender text,
  city_area text,
  created_at timestamptz not null default now(),
  unique (hospital_id, phone)
);
create index idx_patients_hospital on patients (hospital_id);

-- ---------- appointments (core table) ----------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,
  department_id uuid not null references departments(id) on delete restrict,
  type appointment_type not null default 'opd',
  status appointment_status not null default 'pending',
  source lead_source not null default 'website',
  is_walk_in boolean not null default false,
  preferred_date date not null,
  preferred_slot text,
  confirmed_date date,
  confirmed_time time,
  token_number int,
  problem text,
  reject_reason text,
  internal_notes text,
  doctor_notes text,
  follow_up_date date,
  assigned_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_appt_hospital on appointments (hospital_id);
create index idx_appt_status on appointments (status);
create index idx_appt_doctor on appointments (doctor_id);
create index idx_appt_department on appointments (department_id);
create index idx_appt_preferred_date on appointments (preferred_date);
create index idx_appt_confirmed_date on appointments (confirmed_date);
create index idx_appt_hospital_status on appointments (hospital_id, status);
create index idx_appt_doctor_confirmed_date on appointments (doctor_id, confirmed_date);

create trigger trg_appointments_updated_at
before update on appointments
for each row execute function set_updated_at();

-- ---------- appointment_slots (optional slot config) ----------
create table appointment_slots (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 15,
  capacity int not null default 1,
  is_active boolean not null default true
);
create index idx_slots_hospital_doctor_weekday on appointment_slots (hospital_id, doctor_id, weekday);

-- ---------- walk_ins (explicit audit log of walk-in appointments) ----------
create table walk_ins (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  added_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_walkins_hospital on walk_ins (hospital_id);

-- ---------- leads (CRM) ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  name text not null,
  phone text not null,
  city_area text,
  department_id uuid references departments(id) on delete set null,
  doctor_preference uuid references doctors(id) on delete set null,
  source lead_source not null,
  status lead_status not null default 'new',
  appointment_date date,
  follow_up_date date,
  notes text,
  assigned_receptionist uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_leads_hospital on leads (hospital_id);
create index idx_leads_status on leads (status);
create index idx_leads_source on leads (source);
create index idx_leads_followup on leads (follow_up_date);
create index idx_leads_hospital_status on leads (hospital_id, status);
create index idx_leads_phone on leads (phone);

-- ---------- notifications ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  target_role user_role,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user_unread on notifications (hospital_id, user_id, is_read);
create index idx_notif_created on notifications (created_at);

-- ---------- analytics_events (lightweight event log) ----------
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_analytics_hospital_type_created on analytics_events (hospital_id, event_type, created_at);

-- ---------- settings (per-hospital key/value) ----------
create table settings (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  unique (hospital_id, key)
);

create trigger trg_settings_updated_at
before update on settings
for each row execute function set_updated_at();

-- ---------- hospital_pages (editable website content) ----------
create table hospital_pages (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  page_key text not null,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (hospital_id, page_key)
);

create trigger trg_hospital_pages_updated_at
before update on hospital_pages
for each row execute function set_updated_at();

-- ---------- testimonials ----------
create table testimonials (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  patient_name text not null,
  city_area text,
  rating int not null check (rating between 1 and 5),
  text text not null,
  photo_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_testimonials_hospital_published on testimonials (hospital_id, is_published);

-- ---------- audit_logs ----------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_logs (hospital_id, entity_type, entity_id);
create index idx_audit_created on audit_logs (created_at);

-- ============================================================
-- RLS HELPER FUNCTIONS (Section 29)
-- ============================================================

create or replace function auth_hospital_id() returns uuid
language sql stable security definer
set search_path = public as $$
  select hospital_id from public.users where id = auth.uid()
$$;

create or replace function auth_role() returns user_role
language sql stable security definer
set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function auth_doctor_id() returns uuid
language sql stable security definer
set search_path = public as $$
  select doctor_id from public.users where id = auth.uid()
$$;

-- ============================================================
-- ENABLE RLS (default deny on every table)
-- ============================================================

alter table hospitals enable row level security;
alter table users enable row level security;
alter table departments enable row level security;
alter table doctors enable row level security;
alter table services enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table appointment_slots enable row level security;
alter table walk_ins enable row level security;
alter table leads enable row level security;
alter table notifications enable row level security;
alter table analytics_events enable row level security;
alter table settings enable row level security;
alter table hospital_pages enable row level security;
alter table testimonials enable row level security;
alter table audit_logs enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ---------- hospitals ----------
create policy super_admin_all on hospitals for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_read_own on hospitals for select
  to authenticated
  using (id = auth_hospital_id());

create policy owner_update_own on hospitals for update
  to authenticated
  using (id = auth_hospital_id() and auth_role() = 'owner')
  with check (id = auth_hospital_id() and auth_role() = 'owner');

create policy public_read_active on hospitals for select
  to anon, authenticated
  using (is_active = true);

-- ---------- users ----------
create policy super_admin_all on users for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy self_read on users for select
  to authenticated
  using (id = auth.uid());

create policy owner_manage_hospital_users on users for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

-- ---------- departments ----------
create policy super_admin_all on departments for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_read on departments for select
  to authenticated
  using (hospital_id = auth_hospital_id());

create policy owner_manage on departments for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy public_read_active on departments for select
  to anon, authenticated
  using (is_active = true);

-- ---------- doctors ----------
create policy super_admin_all on doctors for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_read on doctors for select
  to authenticated
  using (hospital_id = auth_hospital_id());

create policy owner_manage on doctors for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy doctor_read_self on doctors for select
  to authenticated
  using (id = auth_doctor_id());

create policy public_read_active on doctors for select
  to anon, authenticated
  using (is_active = true);

-- ---------- services ----------
create policy super_admin_all on services for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_read on services for select
  to authenticated
  using (hospital_id = auth_hospital_id());

create policy owner_manage on services for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy public_read_active on services for select
  to anon, authenticated
  using (is_active = true);

-- ---------- patients ----------
-- NOTE: anon never reads this table directly (public booking/status go via
-- security-definer RPCs in 0002_rpcs.sql, which bypass RLS by design).
create policy super_admin_all on patients for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_rw on patients for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'))
  with check (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'));

-- Doctor can read patients linked to their own appointments (for queue display).
-- App layer should select only name/age/gender/problem for doctor screens.
create policy doctor_read_via_appointment on patients for select
  to authenticated
  using (
    auth_role() = 'doctor'
    and exists (
      select 1 from appointments a
      where a.patient_id = patients.id
        and a.doctor_id = auth_doctor_id()
    )
  );

-- ---------- appointments ----------
-- NOTE: anon never reads/writes this table directly; public booking and status
-- lookup go via security-definer RPCs (0002_rpcs.sql).
create policy super_admin_all on appointments for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_rw on appointments for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'))
  with check (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'));

create policy doctor_read_own on appointments for select
  to authenticated
  using (
    hospital_id = auth_hospital_id()
    and auth_role() = 'doctor'
    and doctor_id = auth_doctor_id()
  );

create policy doctor_update_own on appointments for update
  to authenticated
  using (auth_role() = 'doctor' and doctor_id = auth_doctor_id())
  with check (doctor_id = auth_doctor_id());
-- App layer restricts doctor updates to: status, doctor_notes, follow_up_date.

-- ---------- appointment_slots ----------
create policy super_admin_all on appointment_slots for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy owner_manage on appointment_slots for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy staff_read on appointment_slots for select
  to authenticated
  using (hospital_id = auth_hospital_id());

create policy public_read_active on appointment_slots for select
  to anon, authenticated
  using (is_active = true);

-- ---------- walk_ins ----------
create policy super_admin_all on walk_ins for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_rw on walk_ins for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'))
  with check (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'));

-- ---------- leads ----------
create policy super_admin_all on leads for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy staff_rw on leads for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'))
  with check (hospital_id = auth_hospital_id() and auth_role() in ('owner','receptionist'));

-- ---------- notifications ----------
create policy super_admin_all on notifications for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy read_own_or_role on notifications for select
  to authenticated
  using (
    hospital_id = auth_hospital_id()
    and (user_id = auth.uid() or (user_id is null and target_role = auth_role()))
  );

create policy update_own_or_role on notifications for update
  to authenticated
  using (
    hospital_id = auth_hospital_id()
    and (user_id = auth.uid() or (user_id is null and target_role = auth_role()))
  )
  with check (
    hospital_id = auth_hospital_id()
    and (user_id = auth.uid() or (user_id is null and target_role = auth_role()))
  );
-- Inserts come from RPCs/triggers (security definer / service role) only.

-- ---------- analytics_events ----------
create policy super_admin_read on analytics_events for select
  to authenticated
  using (auth_role() = 'super_admin');

create policy owner_read on analytics_events for select
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy anon_insert_site_events on analytics_events for insert
  to anon, authenticated
  with check (true);

-- ---------- settings ----------
create policy super_admin_all on settings for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy owner_rw on settings for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy staff_read on settings for select
  to authenticated
  using (hospital_id = auth_hospital_id());

-- ---------- hospital_pages ----------
create policy super_admin_all on hospital_pages for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy owner_write on hospital_pages for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy public_read on hospital_pages for select
  to anon, authenticated
  using (true);

-- ---------- testimonials ----------
create policy super_admin_all on testimonials for all
  to authenticated
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');

create policy owner_manage on testimonials for all
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner')
  with check (hospital_id = auth_hospital_id() and auth_role() = 'owner');

create policy staff_read on testimonials for select
  to authenticated
  using (hospital_id = auth_hospital_id());

create policy public_read_published on testimonials for select
  to anon, authenticated
  using (is_published = true);

-- ---------- audit_logs ----------
create policy super_admin_read on audit_logs for select
  to authenticated
  using (auth_role() = 'super_admin');

create policy owner_read on audit_logs for select
  to authenticated
  using (hospital_id = auth_hospital_id() and auth_role() = 'owner');
-- No insert/update/delete policies: writes happen only via security-definer
-- RPCs / service role, which bypass RLS by design.
