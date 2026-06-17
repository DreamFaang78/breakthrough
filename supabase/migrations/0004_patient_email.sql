-- 0004_patient_email.sql
-- Capture an optional patient email so we can send automated confirmation /
-- status emails (in addition to the in-app bell + WhatsApp).
--
-- IMPORTANT: This migration is fully additive. It does NOT modify the existing
-- create_appointment_request() function, because the live database has drifted
-- from the repo migrations and that function's signature/body differ here.
-- Instead, the email is stored via a small dedicated SECURITY DEFINER function
-- called right after a booking succeeds.

-- 1) Additive column — safe to run repeatedly.
alter table patients add column if not exists email text;

-- 2) First-write-only email setter, scoped by (hospital_id, phone).
--    Guarded with "email is null" so an anonymous caller can never overwrite
--    an email already on file (prevents notification-address hijacking).
create or replace function set_patient_email(p_hospital_id uuid, p_phone text, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or p_email = '' then
    return;
  end if;

  update patients
     set email = p_email
   where hospital_id = p_hospital_id
     and phone = p_phone
     and email is null;
end;
$$;

grant execute on function set_patient_email(uuid, text, text) to anon, authenticated;
