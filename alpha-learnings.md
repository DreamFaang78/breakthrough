# Alpha Learnings — Hospital OS Architecture (My Style)

> **For:** Me (21, know React + MERN)  
> **Goal:** Understand this codebase *architecture-wise* — where things live, how data flows, how to find bugs fast.  
> **Not:** Random React concepts. This is a map of the building.

---

## 0. One sentence summary

**Hospital OS = Next.js frontend + thin API routes + Supabase Postgres where the REAL logic lives in SQL functions (RPCs).**

---

## 1. MERN brain → this project brain

| What I know (MERN) | What this project uses |
|--------------------|------------------------|
| `create-react-app` / Vite React | **Next.js 15** — pages + API in one repo |
| Express `app.post('/api/...')` | `app/api/*/route.ts` — **thin** handlers |
| MongoDB + Mongoose | **Supabase Postgres** — tables + SQL |
| Business logic in Express controllers | Business logic in **`supabase/migrations/0002_rpcs.sql`** |
| `mongoose.find()` | `supabase.from('table').select()` |
| JWT in localStorage | **Supabase Auth cookies** (httpOnly) |
| One backend repo | **No separate backend** — Next.js talks to Supabase directly |

**Biggest mindset shift:**  
In MERN I fix bugs in Express. Here I fix bugs in **SQL RPCs + RLS policies** first, then UI second.

---

## 2. The building — 4 floors

```
┌─────────────────────────────────────────────┐
│  FLOOR 4 — UI (components/)                 │  Buttons, forms, tables
├─────────────────────────────────────────────┤
│  FLOOR 3 — Pages (app/)                     │  Routes, Server Components fetch data
├─────────────────────────────────────────────┤
│  FLOOR 2 — Gate (middleware.ts + lib/)       │  Auth, tenant, validation
├─────────────────────────────────────────────┤
│  FLOOR 1 — Database (supabase/)              │  Tables, RLS, RPCs = TRUTH
└─────────────────────────────────────────────┘
```

**When something breaks, start from Floor 1 and go up.**  
Don't start from a button color in Floor 4.

---

## 3. Two apps hiding in one repo

This is the #1 thing that confused me at first.

### App A — Public patient website

- **Folder:** `app/(public)/`
- **Users:** Patients (no login)
- **Which hospital?** From **URL / subdomain / ?hospital=slug**
- **Key file:** `lib/tenant.ts` → `getCurrentHospital()`

```
User opens localhost:3000/book
  → middleware.ts figures out slug (sharma-hospital)
  → sets header x-hospital-slug
  → getCurrentHospital() loads that hospital from DB
  → page shows Sharma Hospital's doctors
```

### App B — Staff dashboards

- **Folders:** `app/admin/`, `app/reception/`, `app/doctor/`, `app/super/`
- **Users:** Owner, receptionist, doctor, super admin (login required)
- **Which hospital?** From **logged-in user's `users.hospital_id`** — NOT the URL

```
Receptionist logs in
  → cookie stored by Supabase Auth
  → getCurrentProfile() reads users table
  → profile.hospital_id scopes all queries
  → reception page only shows THAT hospital's appointments
```

### Bug trap 🪤

| Symptom | Wrong place to look | Right place to look |
|---------|---------------------|---------------------|
| Public site shows wrong hospital | `getCurrentProfile()` | `middleware.ts` + `?hospital=` + `NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG` |
| Staff sees wrong hospital data | `getCurrentHospital()` | `users.hospital_id` + `getCurrentProfile()` |

---

## 4. Folder cheat sheet — "I need X, open Y"

| I need to… | Open this |
|------------|-----------|
| Fix patient homepage / book / status | `app/(public)/` |
| Fix login | `app/(auth)/login/` |
| Fix reception desk | `app/reception/` + `components/reception/` |
| Fix doctor queue | `app/doctor/` + `components/doctor/` |
| Fix owner dashboard / analytics | `app/admin/` + `components/admin/` |
| Fix platform super admin | `app/super/` |
| Fix public booking API | `app/api/booking/route.ts` |
| Fix status lookup API | `app/api/status/route.ts` |
| Fix who can open which URL | `middleware.ts` |
| Fix form validation errors | `lib/validation/` |
| Fix "business rules" (approve, token, walk-in) | `supabase/migrations/0002_rpcs.sql` |
| Fix who can read/write DB rows | `supabase/migrations/0001_init.sql` (RLS section) |
| Fix Supabase connection | `lib/supabase/client.ts` (browser), `server.ts` (server) |
| Fix staff account creation | `app/api/admin/staff/route.ts` + `lib/supabase/admin.ts` |

---

## 5. The bouncer — `middleware.ts`

**Every request** hits this file first. It does 2 jobs:

### Job 1 — Pick the hospital (tenant)

```
Production:  sharma-hospital.hospitalos.app  →  slug = "sharma-hospital"
Localhost:   ?hospital=sharma-hospital  OR  env NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG
```

Sets header: `x-hospital-slug`

### Job 2 — Protect staff routes

| URL prefix | Allowed roles |
|------------|---------------|
| `/admin` | owner, super_admin |
| `/reception` | receptionist, owner, super_admin |
| `/doctor` | doctor |
| `/super` | super_admin |

No login? → redirect `/login`  
Wrong role? → redirect `/login?error=not_authorized`

---

## 6. Server vs Client components (Next.js thing)

| | Server Component | Client Component |
|---|------------------|------------------|
| **How to spot** | No `"use client"` at top | Has `"use client"` at top |
| **Runs where** | Server only | Browser |
| **Good for** | Fetching data, SEO pages | Buttons, forms, modals, clicks |
| **Can use hooks?** | No | Yes (`useState`, etc.) |

### Pattern used everywhere here

```
page.tsx          ← Server: fetch appointments from DB, pass as props
    ↓
SomeComponent.tsx ← Client: user clicks "Approve" → supabase.rpc()
```

**Example:** `app/reception/page.tsx` (server) → `components/reception/reception-board.tsx` (client)

### Bug trap 🪤

Page loads fine but button broken? → Check the **client component**, not the page.

---

## 7. Two write paths (MEMORIZE THIS)

Data changes happen in **exactly two ways** in this project.

### Path A — Anonymous user → API route → RPC

**Who:** Patients (booking, status check)  
**Why API in middle?** Patients aren't logged in; we validate + rate-limit before DB.

```
Browser form
  → fetch("/api/booking", { method: "POST", body: ... })
    → app/api/booking/route.ts
      → Zod validation (lib/validation/booking.ts)
      → supabase.rpc("create_appointment_request", { payload })
        → SQL creates patient + appointment + lead
```

**Files to trace:** `components/booking/booking-form.tsx` → `app/api/booking/route.ts` → `0002_rpcs.sql`

### Path B — Logged-in staff → direct RPC from browser

**Who:** Receptionist, doctor, owner  
**Why direct?** They're authenticated; Supabase RLS checks their role.

```
ReceptionBoard button click
  → createClient() from lib/supabase/client.ts
    → supabase.rpc("assign_appointment", { ... })
      → SQL + RLS enforces role + hospital_id
```

**Files to trace:** `components/reception/reception-board.tsx` → `0002_rpcs.sql`

### Quick grep to find which path

```bash
# Path A — goes through API
rg 'fetch\("/api/' components/

# Path B — direct RPC from browser
rg 'supabase\.rpc\(' components/
```

---

## 8. The spine — appointment status machine

Everything in this app is about one `appointments` row changing `status`.

```
                    ┌──────────┐
                    │ pending  │  ← patient books online
                    └────┬─────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      approved      rescheduled     rejected
           │
           ▼
       arrived  ← reception marks "patient came"
           │
           ▼
   in_consultation  ← doctor starts
           │
           ▼
       completed
           │
           ▼
   follow_up_required (optional)
```

**This is enforced in SQL**, not React.  
Function: `is_valid_appointment_transition()` in `0002_rpcs.sql`

### Status bug checklist

1. Open Supabase → `appointments` table → what is `status` right now?
2. What status is the UI trying to set?
3. Is that transition allowed in `is_valid_appointment_transition`?
4. Which RPC is called? (`assign_appointment` / `set_appointment_status` / `issue_token`)

---

## 9. Full trace — "Patient books → Reception approves → Doctor completes"

Do this trace locally once. After this, 80% of bugs make sense.

### Step 1 — Patient books (Path A)

| Step | File | What happens |
|------|------|--------------|
| 1 | `app/(public)/book/page.tsx` | Server loads departments + doctors for current hospital |
| 2 | `components/booking/booking-form.tsx` | User fills form, clicks submit |
| 3 | `app/api/booking/route.ts` | Zod check, honeypot check, inject `hospital_id` |
| 4 | `0002_rpcs.sql` → `create_appointment_request` | Creates/updates `patients`, inserts `appointments` (status=`pending`), `leads`, `notifications` |

**Verify in DB:** New row in `appointments` with `status = pending`

### Step 2 — Receptionist approves (Path B)

| Step | File | What happens |
|------|------|--------------|
| 1 | `app/reception/page.tsx` | Server fetches appointments where `hospital_id = profile.hospital_id` |
| 2 | `components/reception/reception-board.tsx` | Clicks Approve → modal → `supabase.rpc("assign_appointment")` |
| 3 | `0002_rpcs.sql` → `assign_appointment` | Sets doctor, date, time, status → `approved` |

**Verify in DB:** Same appointment now `status = approved`, has `confirmed_date` + `doctor_id`

### Step 3 — Patient arrives + token (Path B)

| Action | RPC | New status |
|--------|-----|------------|
| Mark arrived | `set_appointment_status` | `arrived` |
| Issue token | `issue_token` | token number saved on row |

### Step 4 — Doctor completes (Path B)

| File | RPC | New status |
|------|-----|------------|
| `components/doctor/doctor-queue.tsx` | `set_appointment_status` | `completed` |

### Step 5 — Patient checks status (Path A)

| File | RPC |
|------|-----|
| `components/patient/status-lookup.tsx` → `fetch("/api/status?phone=...")` | `get_patient_status` |

---

## 10. All RPCs — who calls what

| RPC | Who calls it | From where |
|-----|--------------|------------|
| `create_appointment_request` | Anonymous patient | `app/api/booking/route.ts` |
| `get_patient_status` | Anonymous patient | `app/api/status/route.ts` |
| `request_reschedule_or_cancel` | Anonymous patient | `app/api/status/reschedule/route.ts` |
| `add_walk_in` | Receptionist | `components/reception/walk-in-form.tsx` |
| `assign_appointment` | Receptionist | `components/reception/reception-board.tsx` |
| `set_appointment_status` | Reception + Doctor | `reception-board.tsx`, `doctor-queue.tsx` |
| `issue_token` | Receptionist | `reception-board.tsx` |
| `analytics_overview` etc. | Owner | `components/admin/analytics-dashboard.tsx` |

**To find any RPC usage:** `rg "rpc_name_here"` in terminal.

---

## 11. Security — 3 walls (not just login)

```
Wall 1: middleware.ts     → "Can you open /reception at all?"
Wall 2: layout.tsx          → "Does your role match? redirect if not"
Wall 3: Postgres RLS + RPCs  → "Can you touch THIS row?" ← REAL security
```

**Never trust Wall 1 or 2 alone.** Someone can call Supabase API directly. RLS is the actual lock.

SQL helpers (in migrations):
- `auth_hospital_id()` — logged-in user's hospital
- `auth_role()` — owner / receptionist / doctor / super_admin
- `auth_doctor_id()` — which doctor record is linked to this user

---

## 12. Bug-finding playbook (my go-to)

### 🔴 Page blank / 404

1. Is `getCurrentHospital()` returning null? → check slug in middleware
2. Is hospital `is_active = true` in DB?
3. Local: try `?hospital=sharma-hospital`

### 🔴 Login works but wrong page

1. Check `users.role` in Supabase dashboard
2. Check `ROLE_HOME` in `lib/auth/roles.ts`
3. Check `middleware.ts` `PROTECTED_ROLES`

### 🔴 Wrong hospital data

- **Public site** → `x-hospital-slug` header chain
- **Staff dashboard** → `profile.hospital_id`

### 🔴 Button does nothing

1. Browser DevTools → Console tab (JS error?)
2. Network tab → failed `rpc` call?
3. Read error message: `not_authorized`? `invalid_transition`? `invalid_phone`?
4. Check RLS in `0001_init.sql`

### 🔴 API returns 422

→ Zod validation failed. Check `lib/validation/` + API route response `issues` field.

### 🔴 API returns 500

1. Terminal / Vercel logs for `[booking] RPC error:` etc.
2. Supabase dashboard → Logs
3. Open the RPC in `0002_rpcs.sql` — find `raise exception '...'`

### 🔴 Works on localhost, broken on Vercel

1. All env vars set? (`.env.local.example` is the checklist)
2. `NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG` set?
3. Supabase URL/keys correct for prod project?

---

## 13. Search commands I actually use

```bash
# Where is this RPC called?
rg "assign_appointment"

# All RPC calls in frontend
rg "supabase\.rpc\("

# All API calls from components
rg 'fetch\("/api/'

# Where is a table queried?
rg 'from\("appointments"\)'

# Role / auth checks
rg "getCurrentProfile|PROTECTED_ROLES|auth_role"

# Validation for a form
rg "bookingSchema|walkInSchema"
```

---

## 14. Roles quick reference

| Role | After login goes to | Can do |
|------|---------------------|--------|
| `super_admin` | `/super` | See all hospitals (platform) |
| `owner` | `/admin` | Full hospital mgmt + analytics |
| `receptionist` | `/reception` | Approve, walk-in, queue, leads |
| `doctor` | `/doctor` | Own patients only (RLS) |
| Patient | No login | Book + status via phone |

Staff accounts: Supabase Auth user + matching row in `public.users` table.  
Both must exist. Auth alone is not enough.

---

## 15. My 5-day learning plan

| Day | Task | I'll understand |
|-----|------|-----------------|
| **1** | Trace booking end-to-end with Network tab open | Path A (API → RPC) |
| **2** | Login as receptionist, approve a booking, watch DB | Path B (direct RPC) + status machine |
| **3** | Read `create_appointment_request` + `assign_appointment` in SQL | Where business logic actually lives |
| **4** | Read RLS policies for `appointments` + `patients` in `0001_init.sql` | Why direct DB access is blocked |
| **5** | Intentionally break something (approve completed appt), read the error | How SQL protects the app |

---

## 16. MERN habits that will bite me here

| ❌ MERN habit | ✅ Do this instead |
|--------------|-------------------|
| Add logic in Express route | Add logic in SQL RPC |
| Filter hospital in React state | Filter in query + trust RLS |
| `useEffect` fetch on every page | Server Component fetch in `page.tsx` |
| Fix UI first when data wrong | Check DB row first |
| Assume API auth = secure | Check RLS policies |
| One `User` model | Two tables: Supabase `auth.users` + `public.users` (profile) |

---

## 17. Key files — bookmark these

```
middleware.ts                          ← tenant + route guard
lib/tenant.ts                          ← which hospital (public)
lib/auth/profile.ts                    ← who is logged in (staff)
lib/validation/booking.ts              ← form rules
app/api/booking/route.ts               ← public write example
components/reception/reception-board.tsx ← staff write example
supabase/migrations/0001_init.sql      ← schema + RLS
supabase/migrations/0002_rpcs.sql      ← business logic (THE BRAIN)
PRD.md                                 ← full product spec (source of truth)
README.md                              ← setup + implementation status
```

---

## 18. When I'm stuck — ask myself these 5 questions

1. **Am I in App A (public) or App B (staff)?**
2. **Is this a read or a write?**
3. **Path A (API) or Path B (direct RPC)?**
4. **What's the current `status` in the DB?**
5. **Which floor is broken — UI, page, middleware, or SQL?**

If I answer all 5, I usually know which file to open within 2 minutes.

---

*Last updated: June 2026 — branch `feature/admin-completion-and-ux-polish`*