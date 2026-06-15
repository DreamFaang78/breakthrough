-- ============================================================
-- seed.sql
-- Demo hospital for local development / sales demo (Section 43)
-- Safe to re-run: uses ON CONFLICT DO NOTHING on unique keys.
-- ============================================================

insert into hospitals (
  id, name, slug, address, city, phone, whatsapp, emergency_phone,
  google_maps_url, about, default_language, notification_email, is_active
) values (
  '11111111-1111-1111-1111-111111111111',
  'Sharma Multispeciality Hospital',
  'sharma-hospital',
  '123 Mall Road, Near Civil Lines, Kanpur, Uttar Pradesh',
  'Kanpur',
  '+919900000001',
  '+919900000001',
  '+919900000099',
  'https://maps.google.com/?q=Sharma+Multispeciality+Hospital+Kanpur',
  'Sharma Multispeciality Hospital has been serving Kanpur for over 20 years with trusted, affordable care across Medicine, Orthopedics, Gynecology and Dental.',
  'hinglish',
  'owner@sharma-hospital.test',
  true
)
on conflict (slug) do nothing;

-- ---------- Departments ----------
insert into departments (hospital_id, name, slug, icon, description, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'General Medicine', 'general-medicine', 'stethoscope', 'Day-to-day illness, fever, infections and general health checkups.', true),
  ('11111111-1111-1111-1111-111111111111', 'Orthopedics', 'orthopedics', 'bone', 'Bone, joint, fracture and sports injury care.', true),
  ('11111111-1111-1111-1111-111111111111', 'Gynecology & Maternity', 'gynecology-maternity', 'heart-pulse', 'Women''s health, pregnancy care and delivery.', true),
  ('11111111-1111-1111-1111-111111111111', 'Dental', 'dental', 'tooth', 'Dental checkups, root canal, extraction and cleaning.', true)
on conflict (hospital_id, slug) do nothing;

-- ---------- Doctors ----------
insert into doctors (hospital_id, name, slug, qualification, department_id, bio, opd_days, opd_timings, consultation_fee, is_active)
values
  (
    '11111111-1111-1111-1111-111111111111', 'Dr. Rakesh Verma', 'dr-rakesh-verma', 'MBBS, MD (General Medicine)',
    (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'general-medicine'),
    'Dr. Verma has 25 years of experience treating general medical conditions in Kanpur.',
    '["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,
    '{"Mon":{"start":"10:00","end":"14:00"},"Tue":{"start":"10:00","end":"14:00"},"Wed":{"start":"10:00","end":"14:00"},"Thu":{"start":"10:00","end":"14:00"},"Fri":{"start":"10:00","end":"14:00"},"Sat":{"start":"10:00","end":"13:00"}}'::jsonb,
    300,
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111', 'Dr. Asthana', 'dr-asthana', 'MBBS, MS (Ortho)',
    (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'orthopedics'),
    'Visiting orthopedic consultant, available Mon/Wed/Fri.',
    '["Mon","Wed","Fri"]'::jsonb,
    '{"Mon":{"start":"17:00","end":"20:00"},"Wed":{"start":"17:00","end":"20:00"},"Fri":{"start":"17:00","end":"20:00"}}'::jsonb,
    500,
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111', 'Dr. Anjali Singh', 'dr-anjali-singh', 'MBBS, MS (Obs & Gynae)',
    (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'gynecology-maternity'),
    'Specializes in pregnancy care, delivery and women''s health.',
    '["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,
    '{"Mon":{"start":"11:00","end":"15:00"},"Tue":{"start":"11:00","end":"15:00"},"Wed":{"start":"11:00","end":"15:00"},"Thu":{"start":"11:00","end":"15:00"},"Fri":{"start":"11:00","end":"15:00"},"Sat":{"start":"11:00","end":"14:00"}}'::jsonb,
    400,
    true
  )
on conflict (hospital_id, slug) do nothing;

-- ---------- Services ----------
insert into services (hospital_id, department_id, name, description, price, is_active)
values
  ('11111111-1111-1111-1111-111111111111', (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'general-medicine'), 'General Consultation', 'OPD consultation with a general physician.', 300, true),
  ('11111111-1111-1111-1111-111111111111', (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'orthopedics'), 'Fracture Consultation', 'Bone & joint injury assessment with X-Ray review.', 500, true),
  ('11111111-1111-1111-1111-111111111111', (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'gynecology-maternity'), 'Pregnancy Checkup', 'Routine antenatal checkup.', 400, true),
  ('11111111-1111-1111-1111-111111111111', (select id from departments where hospital_id = '11111111-1111-1111-1111-111111111111' and slug = 'dental'), 'Root Canal Treatment', 'Single sitting root canal treatment.', 3500, true);

-- ---------- Testimonials ----------
insert into testimonials (hospital_id, patient_name, city_area, rating, text, is_published)
values
  ('11111111-1111-1111-1111-111111111111', 'Suresh Kumar', 'Civil Lines, Kanpur', 5, 'Bahut accha experience tha, doctor ne dhyaan se sab suna aur sahi dawai di.', true),
  ('11111111-1111-1111-1111-111111111111', 'Rina Devi', 'Govind Nagar, Kanpur', 5, 'Booking online ki thi, time pe appointment mil gaya, wait nahi karna pada.', true);

-- ---------- Homepage content block ----------
insert into hospital_pages (hospital_id, page_key, content)
values (
  '11111111-1111-1111-1111-111111111111',
  'home_hero',
  '{
    "title": "Sharma Multispeciality Hospital, Kanpur",
    "subtitle": "20+ saal se Kanpur ki sewa mein — Medicine, Ortho, Gynae aur Dental ek hi jagah.",
    "cta_primary": "Book Appointment",
    "cta_call": "Call Now"
  }'::jsonb
)
on conflict (hospital_id, page_key) do nothing;

-- ---------- Default settings ----------
insert into settings (hospital_id, key, value)
values
  ('11111111-1111-1111-1111-111111111111', 'arrival_instruction', '{"hi":"Kripya apne appointment se 15 minute pehle aayein.","en":"Please arrive 15 minutes before your appointment."}'::jsonb)
on conflict (hospital_id, key) do nothing;

-- ============================================================
-- STAFF ACCOUNTS (manual step)
-- ============================================================
-- public.users is 1:1 with auth.users, so staff logins cannot be seeded
-- with plain SQL. After creating each auth user (Supabase Dashboard ->
-- Authentication -> Add user, or the Admin API), link the profile:
--
--   insert into public.users (id, hospital_id, role, full_name, email, doctor_id)
--   values (
--     '<auth_user_uuid>',
--     '11111111-1111-1111-1111-111111111111',
--     'owner',                 -- or 'receptionist' / 'doctor' / 'super_admin'
--     'Owner Name',
--     'owner@sharma-hospital.test',
--     null                     -- for role='doctor', set to the matching doctors.id
--   );
