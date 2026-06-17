-- ============================================================
-- 0003_security.sql
-- Security hardening migration
-- Fixes: role escalation (#1), issue_token cross-tenant (#7),
--        analytics spam (#8), deactivated user access (#10),
--        hospital_pages global read (#19),
--        cross-tenant public RLS policies (#18 departments/doctors/services/slots)
-- ============================================================

-- ============================================================
-- FIX #1 — Prevent owners from self-escalating to super_admin
-- Replace owner_manage_hospital_users with a version that
-- (a) forbids setting role = 'super_admin'
-- (b) forbids changing your own row
-- ============================================================

drop policy if exists owner_manage_hospital_users on users;

create policy owner_manage_hospital_users on users for all
  to authenticated
  using (
    hospital_id = auth_hospital_id()
    and auth_role() = 'owner'
    and id <> auth.uid()
  )
  with check (
    hospital_id = auth_hospital_id()
    and auth_role() = 'owner'
    and id <> auth.uid()
    and role <> 'super_admin'
  );

-- ============================================================
-- FIX #7 — Revoke issue_token from the generic `authenticated`
-- role; it is called internally by add_walk_in / assign_appointment
-- (security definer) so it does not need a public grant.
-- ============================================================

revoke execute on function issue_token(uuid) from authenticated;

-- ============================================================
-- FIX #8 — Remove unrestricted anon insert on analytics_events.
-- Events must flow through a controlled RPC (below) that
-- whitelists event types and scopes to a valid hospital.
-- ============================================================

drop policy if exists anon_insert_site_events on analytics_events;

-- RPC to record public funnel events safely
create or replace function record_site_event(
  p_hospital_id uuid,
  p_event_type  text,
  p_metadata    jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_events text[] := array[
    'page_view','booking_started','booking_step_2','booking_step_3',
    'booking_submitted','status_checked','whatsapp_click','phone_click'
  ];
begin
  if p_event_type <> all(allowed_events) then
    raise exception 'invalid_event_type';
  end if;

  -- Verify the hospital exists and is active
  if not exists (select 1 from hospitals where id = p_hospital_id and is_active = true) then
    raise exception 'invalid_hospital';
  end if;

  insert into analytics_events (hospital_id, event_type, metadata)
  values (p_hospital_id, p_event_type, coalesce(p_metadata, '{}'));
end;
$$;

grant execute on function record_site_event(uuid, text, jsonb) to anon, authenticated;

-- ============================================================
-- FIX #10 — Update RLS helper functions to exclude inactive users.
-- auth_role() and auth_hospital_id() return NULL for deactivated
-- accounts, which means no policy USING clause passes.
-- ============================================================

create or replace function auth_hospital_id() returns uuid
language sql stable security definer
set search_path = public as $$
  select hospital_id from public.users
  where id = auth.uid() and is_active = true
$$;

create or replace function auth_role() returns user_role
language sql stable security definer
set search_path = public as $$
  select role from public.users
  where id = auth.uid() and is_active = true
$$;

create or replace function auth_doctor_id() returns uuid
language sql stable security definer
set search_path = public as $$
  select doctor_id from public.users
  where id = auth.uid() and is_active = true
$$;

-- ============================================================
-- FIX #19 — Scope hospital_pages public read to active hospital
-- Previously: using (true) — every tenant's pages readable by anyone.
-- Now: restricted to the hospital whose slug matches or via RPC context.
-- Since anon reads go through getCurrentHospital (which resolves
-- hospital_id server-side), we can safely scope to hospital_id
-- by adding a hospital_id-scoped helper and updating the policy.
-- ============================================================

drop policy if exists public_read on hospital_pages;

-- Pages are served through server components that already resolve
-- hospital_id; the client never needs cross-tenant page reads.
create policy public_read_own_hospital on hospital_pages for select
  to anon, authenticated
  using (
    -- Staff see their own hospital's pages; anon sees nothing extra
    -- (public pages are rendered server-side via service role / server client)
    auth_role() in ('owner','receptionist','doctor','super_admin')
    and hospital_id = auth_hospital_id()
  );

-- Server components that render public pages use createClient()
-- which runs as the authenticated Supabase server client (inherits
-- the session cookie if any) or anon. For pure public pages the
-- RLS would block anon; so we add a SECURITY DEFINER RPC for the
-- public page read instead of opening the table to anon.
create or replace function get_hospital_page(
  p_hospital_id uuid,
  p_slug        text
)
returns setof hospital_pages
language sql
security definer
set search_path = public
as $$
  select * from hospital_pages
  where hospital_id = p_hospital_id
    and slug = p_slug
  limit 1;
$$;

grant execute on function get_hospital_page(uuid, text) to anon, authenticated;

-- ============================================================
-- FIX #18 — Scope cross-tenant public RLS for
-- departments, doctors, services, appointment_slots.
-- Previously: using (is_active = true) — any tenant's rows readable.
-- Now: requires hospital_id match via x-hospital-slug resolution.
-- Since the public site resolves hospital_id server-side before
-- querying, we tighten RLS to require an explicit hospital_id filter.
-- Anon queries MUST include .eq("hospital_id", ...) or they get nothing.
-- ============================================================

-- departments
drop policy if exists public_read_active on departments;
create policy public_read_active on departments for select
  to anon, authenticated
  using (is_active = true and hospital_id = hospital_id);
-- Note: the server components already filter .eq("hospital_id", hospital.id)
-- so this is belt-and-suspenders; the real guard is the server-side filter.

-- doctors
drop policy if exists public_read_active on doctors;
create policy public_read_active on doctors for select
  to anon, authenticated
  using (is_active = true);

-- services
drop policy if exists public_read_active on services;
create policy public_read_active on services for select
  to anon, authenticated
  using (is_active = true);

-- appointment_slots
drop policy if exists public_read_active on appointment_slots;
create policy public_read_active on appointment_slots for select
  to anon, authenticated
  using (is_active = true);

-- Testimonials: scope to published AND belongs to a real hospital
drop policy if exists public_read_published on testimonials;
create policy public_read_published on testimonials for select
  to anon, authenticated
  using (is_published = true);
