-- ============================================================
-- 0002_rpcs.sql
-- Hospital OS - RPCs (Section 30)
-- All public/anon writes go through security-definer RPCs.
-- All status transitions are validated server-side.
-- ============================================================

-- ============================================================
-- STATE MACHINE (Section 18)
-- ============================================================

create or replace function is_valid_appointment_transition(old_status appointment_status, new_status appointment_status)
returns boolean
language sql
immutable
as $$
  select case old_status
    when 'pending'             then new_status in ('approved','rescheduled','rejected','cancelled')
    when 'approved'            then new_status in ('arrived','rescheduled','cancelled','no_show')
    when 'rescheduled'         then new_status in ('approved','cancelled','rejected')
    when 'arrived'             then new_status in ('in_consultation','no_show','cancelled')
    when 'in_consultation'     then new_status in ('completed')
    when 'completed'           then new_status in ('follow_up_required')
    when 'no_show'             then new_status in ('follow_up_required')
    when 'follow_up_required'  then false
    when 'rejected'            then false
    when 'cancelled'           then false
    else false
  end
$$;

-- ============================================================
-- ANALYTICS ACCESS GUARD
-- ============================================================

create or replace function _check_analytics_access(p_hospital_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth_role() = 'super_admin' then return; end if;
  if auth_role() = 'owner' and auth_hospital_id() = p_hospital_id then return; end if;
  raise exception 'not_authorized';
end;
$$;

-- ============================================================
-- create_appointment_request(payload jsonb)
-- Public booking entry point (anon-callable).
-- ============================================================

create or replace function create_appointment_request(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid := (payload->>'hospital_id')::uuid;
  v_phone text := payload->>'phone';
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

  insert into patients (hospital_id, name, phone, age, gender, city_area)
  values (
    v_hospital_id,
    payload->>'name',
    v_phone,
    (payload->>'age')::int,
    payload->>'gender',
    payload->>'city_area'
  )
  on conflict (hospital_id, phone)
  do update set
    name = excluded.name,
    age = coalesce(excluded.age, patients.age),
    gender = coalesce(excluded.gender, patients.gender),
    city_area = coalesce(excluded.city_area, patients.city_area)
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

-- ============================================================
-- issue_token(appointment_id)
-- Next token for (hospital_id, doctor_id, date)
-- ============================================================

create or replace function issue_token(p_appointment_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid;
  v_doctor_id uuid;
  v_date date;
  v_next int;
begin
  select hospital_id, doctor_id, coalesce(confirmed_date, preferred_date, current_date)
    into v_hospital_id, v_doctor_id, v_date
    from appointments where id = p_appointment_id;

  select coalesce(max(token_number), 0) + 1 into v_next
    from appointments
    where hospital_id = v_hospital_id
      and coalesce(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(v_doctor_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and coalesce(confirmed_date, preferred_date) = v_date
      and token_number is not null;

  update appointments set token_number = v_next where id = p_appointment_id;
  return v_next;
end;
$$;

grant execute on function issue_token(uuid) to authenticated;

-- ============================================================
-- add_walk_in(payload jsonb)
-- Staff-only: creates patient + arrived appointment + token + lead
-- ============================================================

create or replace function add_walk_in(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hospital_id uuid := auth_hospital_id();
  v_patient_id uuid;
  v_appointment_id uuid;
  v_token int;
begin
  if auth_role() not in ('owner','receptionist') then
    raise exception 'not_authorized';
  end if;

  insert into patients (hospital_id, name, phone, age, gender, city_area)
  values (v_hospital_id, payload->>'name', payload->>'phone',
          (payload->>'age')::int, payload->>'gender', payload->>'city_area')
  on conflict (hospital_id, phone)
  do update set
    name = excluded.name,
    age = coalesce(excluded.age, patients.age),
    gender = coalesce(excluded.gender, patients.gender)
  returning id into v_patient_id;

  insert into appointments (
    hospital_id, patient_id, doctor_id, department_id, type, status, source,
    is_walk_in, preferred_date, problem, assigned_by
  ) values (
    v_hospital_id, v_patient_id, (payload->>'doctor_id')::uuid, (payload->>'department_id')::uuid,
    'opd', 'arrived', 'walk_in', true, current_date, payload->>'problem', auth.uid()
  )
  returning id into v_appointment_id;

  v_token := issue_token(v_appointment_id);

  insert into walk_ins (hospital_id, appointment_id, added_by)
  values (v_hospital_id, v_appointment_id, auth.uid());

  insert into leads (
    hospital_id, patient_id, appointment_id, name, phone, city_area,
    department_id, doctor_preference, source, status, appointment_date, assigned_receptionist
  ) values (
    v_hospital_id, v_patient_id, v_appointment_id, payload->>'name', payload->>'phone', payload->>'city_area',
    (payload->>'department_id')::uuid, (payload->>'doctor_id')::uuid, 'walk_in', 'appointment_booked',
    current_date, auth.uid()
  );

  insert into audit_logs (hospital_id, actor_id, action, entity_type, entity_id, after)
  values (v_hospital_id, auth.uid(), 'appointment.walk_in_created', 'appointment', v_appointment_id,
          jsonb_build_object('status','arrived','token_number', v_token));

  return jsonb_build_object('appointment_id', v_appointment_id, 'patient_id', v_patient_id, 'token_number', v_token);
end;
$$;

grant execute on function add_walk_in(jsonb) to authenticated;

-- ============================================================
-- set_appointment_status(appointment_id, new_status, meta)
-- Validates the state machine; role-checked; syncs lead; audits.
-- ============================================================

create or replace function set_appointment_status(p_appointment_id uuid, p_new_status appointment_status, p_meta jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_role user_role := auth_role();
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt is null then
    raise exception 'not_found';
  end if;

  if v_role = 'super_admin' then
    null;
  elsif v_role in ('owner','receptionist') then
    if v_appt.hospital_id <> auth_hospital_id() then
      raise exception 'not_authorized';
    end if;
  elsif v_role = 'doctor' then
    if v_appt.doctor_id is distinct from auth_doctor_id() then
      raise exception 'not_authorized';
    end if;
    if p_new_status not in ('in_consultation','completed','follow_up_required','no_show') then
      raise exception 'not_authorized_transition';
    end if;
  else
    raise exception 'not_authorized';
  end if;

  if not is_valid_appointment_transition(v_appt.status, p_new_status) then
    raise exception 'invalid_transition: % -> %', v_appt.status, p_new_status;
  end if;

  update appointments set
    status = p_new_status,
    reject_reason = case when p_new_status = 'rejected' then coalesce(p_meta->>'reject_reason', reject_reason) else reject_reason end,
    internal_notes = case when p_meta ? 'internal_notes' then p_meta->>'internal_notes' else internal_notes end,
    doctor_notes = case when p_meta ? 'doctor_notes' then p_meta->>'doctor_notes' else doctor_notes end,
    follow_up_date = case when p_meta ? 'follow_up_date' then (p_meta->>'follow_up_date')::date else follow_up_date end,
    confirmed_date = case when p_meta ? 'confirmed_date' then (p_meta->>'confirmed_date')::date else confirmed_date end,
    confirmed_time = case when p_meta ? 'confirmed_time' then (p_meta->>'confirmed_time')::time else confirmed_time end,
    assigned_by = case when v_role in ('owner','receptionist') then auth.uid() else assigned_by end
  where id = p_appointment_id;

  update leads set
    status = case p_new_status
      when 'approved' then 'appointment_booked'
      when 'completed' then 'visited'
      when 'no_show' then 'follow_up_required'
      when 'follow_up_required' then 'follow_up_required'
      when 'rejected' then 'lost'
      when 'cancelled' then 'not_interested'
      else status
    end,
    follow_up_date = case when p_meta ? 'follow_up_date' then (p_meta->>'follow_up_date')::date else follow_up_date end
  where appointment_id = p_appointment_id;

  insert into audit_logs (hospital_id, actor_id, action, entity_type, entity_id, before, after)
  values (v_appt.hospital_id, auth.uid(), 'appointment.status_change', 'appointment', p_appointment_id,
          jsonb_build_object('status', v_appt.status), jsonb_build_object('status', p_new_status));

  if v_role = 'doctor' then
    insert into notifications (hospital_id, target_role, type, title, body, entity_type, entity_id)
    values (v_appt.hospital_id, 'receptionist', 'status_change',
            'Appointment ' || p_new_status, 'Doctor updated appointment status', 'appointment', p_appointment_id);
  end if;

  return jsonb_build_object('id', p_appointment_id, 'status', p_new_status);
end;
$$;

grant execute on function set_appointment_status(uuid, appointment_status, jsonb) to authenticated;

-- ============================================================
-- assign_appointment(appointment_id, doctor_id, confirmed_date, confirmed_time)
-- Staff-only: approve + assign doctor & slot.
-- ============================================================

create or replace function assign_appointment(p_appointment_id uuid, p_doctor_id uuid, p_confirmed_date date, p_confirmed_time time)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
begin
  if auth_role() not in ('owner','receptionist','super_admin') then
    raise exception 'not_authorized';
  end if;

  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt is null then
    raise exception 'not_found';
  end if;

  if auth_role() <> 'super_admin' and v_appt.hospital_id <> auth_hospital_id() then
    raise exception 'not_authorized';
  end if;

  if v_appt.status <> 'approved' and not is_valid_appointment_transition(v_appt.status, 'approved') then
    raise exception 'invalid_transition: % -> approved', v_appt.status;
  end if;

  update appointments set
    doctor_id = p_doctor_id,
    confirmed_date = p_confirmed_date,
    confirmed_time = p_confirmed_time,
    status = 'approved',
    assigned_by = auth.uid()
  where id = p_appointment_id;

  update leads set status = 'appointment_booked', appointment_date = p_confirmed_date
  where appointment_id = p_appointment_id;

  insert into audit_logs (hospital_id, actor_id, action, entity_type, entity_id, before, after)
  values (v_appt.hospital_id, auth.uid(), 'appointment.assigned', 'appointment', p_appointment_id,
          jsonb_build_object('status', v_appt.status, 'doctor_id', v_appt.doctor_id),
          jsonb_build_object('status','approved','doctor_id', p_doctor_id, 'confirmed_date', p_confirmed_date, 'confirmed_time', p_confirmed_time));

  return jsonb_build_object('id', p_appointment_id, 'status', 'approved');
end;
$$;

grant execute on function assign_appointment(uuid, uuid, date, time) to authenticated;

-- ============================================================
-- get_patient_status(phone, hospital_id, ref)
-- Anon-callable: returns only that patient's safe status fields.
-- ============================================================

create or replace function get_patient_status(p_phone text, p_hospital_id uuid, p_ref uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_result jsonb;
begin
  select id into v_patient_id from patients where hospital_id = p_hospital_id and phone = p_phone;
  if v_patient_id is null then
    return jsonb_build_object('found', false);
  end if;

  select jsonb_build_object(
    'found', true,
    'patient_name', p.name,
    'appointments', coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'preferred_date', a.preferred_date,
      'preferred_slot', a.preferred_slot,
      'confirmed_date', a.confirmed_date,
      'confirmed_time', a.confirmed_time,
      'token_number', a.token_number,
      'doctor_name', d.name,
      'department_name', dep.name,
      'follow_up_date', a.follow_up_date
    ) order by a.created_at desc) filter (where a.id is not null), '[]'::jsonb)
  ) into v_result
  from patients p
  left join appointments a on a.patient_id = p.id
    and (p_ref is null or a.id = p_ref)
  left join doctors d on d.id = a.doctor_id
  left join departments dep on dep.id = a.department_id
  where p.id = v_patient_id
  group by p.name;

  return v_result;
end;
$$;

grant execute on function get_patient_status(text, uuid, uuid) to anon, authenticated;

-- ============================================================
-- request_reschedule_or_cancel(phone, appointment_id, action, meta)
-- Anon-callable: creates a receptionist-visible request; does NOT
-- mutate the confirmed schedule directly.
-- ============================================================

create or replace function request_reschedule_or_cancel(p_phone text, p_appointment_id uuid, p_action text, p_meta jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
begin
  if p_action not in ('reschedule','cancel') then
    raise exception 'invalid_action';
  end if;

  select a.* into v_appt from appointments a
    join patients p on p.id = a.patient_id
    where a.id = p_appointment_id and p.phone = p_phone;

  if v_appt is null then
    raise exception 'not_found';
  end if;

  update appointments set internal_notes =
    coalesce(internal_notes, '') ||
    case when internal_notes is null or internal_notes = '' then '' else E'\n' end ||
    format('[Patient request: %s] %s', p_action, coalesce(p_meta->>'reason', p_meta->>'requested_date', ''))
  where id = p_appointment_id;

  insert into notifications (hospital_id, target_role, type, title, body, entity_type, entity_id)
  values (v_appt.hospital_id, 'receptionist',
          case p_action when 'reschedule' then 'reschedule_request' else 'cancellation_request' end,
          'Patient requested ' || p_action,
          coalesce(p_meta->>'reason', p_meta->>'requested_date', ''),
          'appointment', p_appointment_id);

  insert into audit_logs (hospital_id, actor_id, action, entity_type, entity_id, after)
  values (v_appt.hospital_id, null, 'appointment.patient_' || p_action || '_request', 'appointment', p_appointment_id, p_meta);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function request_reschedule_or_cancel(text, uuid, text, jsonb) to anon, authenticated;

-- ============================================================
-- ANALYTICS RPCs (Owner / Super Admin only)
-- ============================================================

create or replace function analytics_overview(p_hospital_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform _check_analytics_access(p_hospital_id);

  select jsonb_build_object(
    'total_requests', count(*),
    'approved', count(*) filter (where status = 'approved'),
    'completed', count(*) filter (where status = 'completed'),
    'rejected', count(*) filter (where status = 'rejected'),
    'no_show', count(*) filter (where status = 'no_show'),
    'walk_in', count(*) filter (where is_walk_in = true),
    'online', count(*) filter (where is_walk_in = false),
    'conversion_rate', case when count(*) = 0 then 0
      else round(100.0 * count(*) filter (where status = 'completed') / count(*), 1) end
  ) into v_result
  from appointments
  where hospital_id = p_hospital_id
    and preferred_date between p_from and p_to;

  v_result := v_result || jsonb_build_object(
    'follow_ups_pending', (
      select count(*) from leads
      where hospital_id = p_hospital_id and status = 'follow_up_required' and follow_up_date <= current_date
    ),
    'lost_leads', (
      select count(*) from leads
      where hospital_id = p_hospital_id and status in ('lost','not_interested')
        and created_at::date between p_from and p_to
    )
  );

  return v_result;
end;
$$;

grant execute on function analytics_overview(uuid, date, date) to authenticated;

create or replace function analytics_by_doctor(p_hospital_id uuid, p_from date, p_to date)
returns table(doctor_id uuid, doctor_name text, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _check_analytics_access(p_hospital_id);
  return query
    select d.id, d.name, count(a.id)
    from doctors d
    left join appointments a on a.doctor_id = d.id and a.preferred_date between p_from and p_to
    where d.hospital_id = p_hospital_id
    group by d.id, d.name
    order by count(a.id) desc;
end;
$$;

grant execute on function analytics_by_doctor(uuid, date, date) to authenticated;

create or replace function analytics_by_department(p_hospital_id uuid, p_from date, p_to date)
returns table(department_id uuid, department_name text, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _check_analytics_access(p_hospital_id);
  return query
    select dep.id, dep.name, count(a.id)
    from departments dep
    left join appointments a on a.department_id = dep.id and a.preferred_date between p_from and p_to
    where dep.hospital_id = p_hospital_id
    group by dep.id, dep.name
    order by count(a.id) desc;
end;
$$;

grant execute on function analytics_by_department(uuid, date, date) to authenticated;

create or replace function analytics_by_source(p_hospital_id uuid, p_from date, p_to date)
returns table(source lead_source, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _check_analytics_access(p_hospital_id);
  return query
    select l.source, count(*)
    from leads l
    where l.hospital_id = p_hospital_id and l.created_at::date between p_from and p_to
    group by l.source
    order by count(*) desc;
end;
$$;

grant execute on function analytics_by_source(uuid, date, date) to authenticated;

create or replace function analytics_timeseries(p_hospital_id uuid, p_from date, p_to date)
returns table(day date, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _check_analytics_access(p_hospital_id);
  return query
    select gs.day::date, count(a.id)
    from generate_series(p_from, p_to, interval '1 day') gs(day)
    left join appointments a on a.preferred_date = gs.day::date and a.hospital_id = p_hospital_id
    group by gs.day
    order by gs.day;
end;
$$;

grant execute on function analytics_timeseries(uuid, date, date) to authenticated;
