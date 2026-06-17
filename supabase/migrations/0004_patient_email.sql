-- 0004_patient_email.sql
-- Capture an optional patient email at booking time so we can send the patient
-- automated confirmation / status emails (in addition to the in-app bell + WhatsApp).

alter table patients add column if not exists email text;

-- Recreate create_appointment_request to persist the email.
-- Only the patient INSERT / ON CONFLICT block changes; the rest is identical to 0002.
create or replace function create_appointment_request(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid := (payload->>'hospital_id')::uuid;
  v_phone text := payload->>'phone';
  v_email text := nullif(payload->>'email', '');
  v_patient_id uuid;
  v_appointment_id uuid;
  v_lead_id uuid;
begin
  if not exists (select 1 from hospitals where id = v_hospital_id and is_active = true) then
    raise exception 'invalid_hospital';
  end if;

  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) <> 10 then
    raise exception 'invalid_phone';
  end if;

  if (payload->>'preferred_date')::date < current_date then
    raise exception 'invalid_date';
  end if;

  insert into patients (hospital_id, name, phone, age, gender, city_area, email)
  values (
    v_hospital_id,
    payload->>'name',
    v_phone,
    (payload->>'age')::int,
    payload->>'gender',
    payload->>'city_area',
    v_email
  )
  on conflict (hospital_id, phone)
  do update set
    name = excluded.name,
    age = coalesce(excluded.age, patients.age),
    gender = coalesce(excluded.gender, patients.gender),
    city_area = coalesce(excluded.city_area, patients.city_area),
    email = coalesce(excluded.email, patients.email)
  returning id into v_patient_id;

  insert into appointments (
    hospital_id, patient_id, doctor_id, department_id, type, status, source,
    preferred_date, preferred_slot, problem
  ) values (
    v_hospital_id,
    v_patient_id,
    (payload->>'doctor_id')::uuid,
    (payload->>'department_id')::uuid,
    coalesce((payload->>'type')::appointment_type, 'opd'),
    'pending',
    'website',
    (payload->>'preferred_date')::date,
    payload->>'preferred_slot',
    payload->>'problem'
  )
  returning id into v_appointment_id;

  insert into leads (
    hospital_id, patient_id, appointment_id, name, phone, city_area,
    department_id, doctor_preference, source, status, appointment_date, notes
  ) values (
    v_hospital_id, v_patient_id, v_appointment_id, payload->>'name', v_phone, payload->>'city_area',
    (payload->>'department_id')::uuid, (payload->>'doctor_id')::uuid, 'website', 'new',
    (payload->>'preferred_date')::date, payload->>'problem'
  )
  returning id into v_lead_id;

  insert into analytics_events (hospital_id, event_type, entity_type, entity_id, metadata)
  values (v_hospital_id, 'booking_submitted', 'appointment', v_appointment_id,
          jsonb_build_object('source','website'));

  insert into notifications (hospital_id, target_role, type, title, body, entity_type, entity_id)
  values (v_hospital_id, 'receptionist', 'new_request', 'New appointment request',
          coalesce(payload->>'name','') || ' - ' || coalesce(payload->>'preferred_date',''),
          'appointment', v_appointment_id);

  return jsonb_build_object('appointment_id', v_appointment_id, 'patient_id', v_patient_id, 'lead_id', v_lead_id);
end;
$$;

grant execute on function create_appointment_request(jsonb) to anon, authenticated;
