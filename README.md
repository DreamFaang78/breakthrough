# Hospital OS

**A modern front-desk operating system for Tier 2 / Tier 3 Indian hospitals.**

Hospital OS turns missed phone calls, WhatsApp messages, paper registers, and walk-ins into one simple digital flow: patients book online, receptionists approve and queue them, doctors see their day on a phone, and owners see growth numbers every morning. It is deliberately **not** an ERP, EHR, or billing suite — it wins on simplicity, speed, and daily staff adoption.

> **Full product spec:** [`PRD.md`](./PRD.md) — treat this as the contract. Build in phase order (Section 39). Use Sections 27–30 for database, RLS, and API design. Use Section 40 for definition of done.

---

## Table of Contents

1. [Who this is for](#who-this-is-for)
2. [The core promise](#the-core-promise)
3. [Architecture at a glance](#architecture-at-a-glance)
4. [Tech stack](#tech-stack)
5. [Repository map](#repository-map)
6. [Multi-tenancy](#multi-tenancy)
7. [Roles, routes, and permissions](#roles-routes-and-permissions)
8. [The product spine (end-to-end flow)](#the-product-spine-end-to-end-flow)
9. [Data model and backend contract](#data-model-and-backend-contract)
10. [Implementation status](#implementation-status)
11. [What to build next](#what-to-build-next)
12. [Local development setup](#local-development-setup)
13. [Demo accounts and sales flow](#demo-accounts-and-sales-flow)
14. [Guidelines for developers and AI agents](#guidelines-for-developers-and-ai-agents)
15. [Deployment](#deployment)
16. [Key documents](#key-documents)

---

## Who this is for

| User | Device | Job to be done |
|------|--------|----------------|
| **Hospital owner / admin** | Mobile | See daily performance, control setup, stop losing patients |
| **Receptionist** | Desktop + mobile | One screen for requests, walk-ins, queue, and tokens |
| **Doctor** | Mobile | Today's patients only — name, complaint, mark done |
| **Patient / attendant** | Mobile | Book in 30 seconds, check status without calling again |
| **Super admin (SaaS operator)** | Desktop | Onboard hospitals, manage tenants |

**Target market:** small and mid-sized hospitals in Indian cities (Kanpur, Lucknow, Gorakhpur, Kota, etc.) where demand is phone-first, walk-in heavy, and staff are not power users.

---

## The core promise

```
Patient books request (website)
  → Receptionist approves / reschedules / rejects
  → Patient checks status (phone lookup)
  → Day of visit: Arrived → Token → In Consultation → Completed
  → Lead CRM + Owner analytics capture everything
```

**Walk-ins** enter the same queue via reception — no separate system.

**Design test:** Can a 45-year-old receptionist who has never used SaaS complete her first approval in under 10 seconds on day one?

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 15 (App Router)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Public site  │  │ Staff areas  │  │ API routes (thin)      │ │
│  │ /book /status│  │ /admin       │  │ POST /api/booking      │ │
│  │ /doctors ... │  │ /reception   │  │ GET  /api/status       │ │
│  │              │  │ /doctor      │  │ POST /api/admin/staff  │ │
│  │              │  │ /super       │  │ POST /api/notify (stub)│ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                       │              │
│         └─────────────────┼───────────────────────┘              │
│                           ▼                                     │
│              Supabase JS client (SSR + browser)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                │
│  Postgres + RLS  │  Auth  │  Storage (future)  │  Realtime     │
│                                                                 │
│  Business logic lives in SECURITY DEFINER RPCs:                 │
│  create_appointment_request, add_walk_in, set_appointment_      │
│  status, assign_appointment, issue_token, get_patient_status,   │
│  analytics_*                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Architectural rules (non-negotiable):**

1. **Database first** — frontend follows the schema in `PRD.md` §28–29, not the other way around.
2. **RLS is the security boundary** — never rely on UI-only checks for tenant isolation or role access.
3. **Public writes go through RPCs** — anon users never `INSERT` directly into `patients` or `appointments`.
4. **Service role is server-only** — `SUPABASE_SERVICE_ROLE_KEY` is used in `lib/supabase/admin.ts` for staff account creation only; never ship it to the browser.
5. **Ship the simpler version** — Morning/Evening slots before full slot grids; polling before Realtime; email before WhatsApp.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Forms | React Hook Form + Zod (`lib/validation/`) |
| Charts | Recharts (admin analytics) |
| Backend | Supabase (Postgres, Auth, RLS) |
| Hosting | Vercel (target) |

---

## Repository map

```
app/
  (public)/          # Patient-facing hospital website (SSR, SEO)
    page.tsx         # Home — hero, doctors, departments, testimonials
    book/            # Appointment request form
    status/          # Phone-based status lookup
    doctors/         # List + [slug] detail
    departments/     # List + [slug] detail
    services, about, contact, faq, reviews, location, emergency
    sitemap.ts, robots.ts
  (auth)/login/      # Staff login → role-based redirect
  admin/             # Owner dashboard + CRUD
  reception/         # Front desk: requests, walk-in, leads
  doctor/            # Doctor queue (own appointments only)
  super/             # Platform operator (tenant list)
  api/
    booking/         # Public booking → create_appointment_request RPC
    status/          # Public status → get_patient_status RPC
    admin/staff/     # Owner creates receptionist/doctor accounts
    notify/          # Stub — email dispatch not wired yet

components/
  website/           # SiteHeader, SiteFooter, StickyCta
  booking/           # BookingForm (multi-step)
  reception/         # ReceptionBoard, WalkInForm, LeadsTable
  doctor/            # DoctorQueue
  patient/           # StatusLookup
  admin/             # CRUD tables, AnalyticsDashboard, profile/content forms
  common/            # StaffHeader, StatCard, SignOutButton
  ui/                # shadcn primitives

lib/
  supabase/          # client.ts, server.ts, middleware.ts, admin.ts
  tenant.ts          # getCurrentHospital() from x-hospital-slug header
  auth/              # profile.ts, roles.ts
  validation/        # booking.ts, walk-in.ts (Zod schemas)
  rpc/               # Typed wrappers (partial — extend as needed)
  i18n/              # hi / en / hinglish dictionaries (not fully wired to UI)
  types.ts           # Hand-written domain types until Supabase types are generated

supabase/
  migrations/
    0001_init.sql    # Schema, enums, indexes, RLS policies
    0002_rpcs.sql    # All business-logic RPCs + state machine
  seed.sql           # Demo hospital: Sharma Multispeciality Hospital, Kanpur

middleware.ts        # Tenant slug resolution + staff route protection
PRD.md               # Full product requirements (source of truth)
```

---

## Multi-tenancy

Every hospital is a **tenant** scoped by `hospital_id` on nearly every table.

**How the active hospital is resolved:**

| Environment | Resolution |
|-------------|------------|
| Production subdomain | `sharma-hospital.hospitalos.app` → slug `sharma-hospital` |
| Localhost / Vercel preview | `?hospital=sharma-hospital` or `NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG` |

`middleware.ts` sets the `x-hospital-slug` header. `lib/tenant.ts` loads the hospital row for public pages.

**Staff dashboards** (`/admin`, `/reception`, `/doctor`) are scoped by the logged-in user's `users.hospital_id`, not the URL subdomain.

---

## Roles, routes, and permissions

| Role | Login? | Home route | Can access |
|------|--------|------------|------------|
| `super_admin` | Yes | `/super` | All hospitals (platform ops) |
| `owner` | Yes | `/admin` | Full hospital management + analytics |
| `receptionist` | Yes | `/reception` | Requests, walk-ins, queue, leads |
| `doctor` | Yes | `/doctor` | Own appointments only (RLS-enforced) |
| Patient | No password | `/status` | Own appointments via phone lookup |

Middleware enforces route prefixes in `middleware.ts`. Fine-grained access is enforced in **Postgres RLS** via `auth_hospital_id()`, `auth_role()`, and `auth_doctor_id()` helper functions.

---

## The product spine (end-to-end flow)

### Online patient

1. Finds hospital on Google / Maps → lands on `/`
2. Taps **Book Appointment** → `/book`
3. Submits request → `POST /api/booking` → `create_appointment_request` RPC
4. Creates: `patients` (deduped by phone) + `appointments` (status: `pending`) + `leads` (source: `website`)
5. Confirmation shows link to `/status?phone=...`

### Receptionist

1. Sees pending requests on `/reception` (ReceptionBoard)
2. **Approve** → `assign_appointment` RPC (doctor + confirmed date/time)
3. **Reject** → `set_appointment_status` with reason
4. **Reschedule** → status `rescheduled`, then re-approve
5. Patient arrives → **Arrived** → `issue_token` RPC → **In Consultation** → **Completed**
6. Walk-in → `/reception/walk-in` → `add_walk_in` RPC (status: `arrived`, token issued)

### Doctor

1. Opens `/doctor` on phone
2. Sees today's queue ordered by token (RLS: own `doctor_id` only)
3. Adds consult note, marks **Completed**, sets **Follow-up**

### Owner

1. `/admin/analytics` — KPIs via `analytics_*` RPCs
2. `/admin/leads` — full CRM with source/status filters
3. `/admin/*` — manage doctors, departments, services, timings, staff, profile, content

### Appointment state machine

Enforced server-side in `is_valid_appointment_transition()` (`0002_rpcs.sql`):

```
pending → approved | rescheduled | rejected | cancelled
approved → arrived | rescheduled | cancelled | no_show
arrived → in_consultation | no_show | cancelled
in_consultation → completed
completed → follow_up_required
```

---

## Data model and backend contract

### Core tables

`hospitals` → `departments`, `doctors`, `services`, `users` (staff)
`patients` → `appointments` ↔ `leads`
Supporting: `hospital_pages`, `testimonials`, `settings`, `notifications`, `audit_logs`, `analytics_events`

### RPCs (always prefer these over raw writes)

| RPC | Who calls | Purpose |
|-----|-----------|---------|
| `create_appointment_request` | Anon (via `/api/booking`) | Public booking |
| `get_patient_status` | Anon (via `/api/status`) | Phone status lookup |
| `request_reschedule_or_cancel` | Anon | **DB ready; UI not wired** |
| `add_walk_in` | Receptionist | Walk-in entry + lead |
| `assign_appointment` | Receptionist / owner | Approve + assign slot |
| `set_appointment_status` | Receptionist / doctor | Lifecycle transitions + lead sync |
| `issue_token` | Receptionist | Daily per-doctor token number |
| `analytics_overview` etc. | Owner | Dashboard aggregates |

### Frontend → backend pattern

- **Public mutations:** Next.js Route Handler validates with Zod → calls RPC
- **Staff mutations:** Client component calls `supabase.rpc(...)` with authenticated session (RLS applies)
- **Staff CRUD (admin):** Direct Supabase client queries where RLS allows owner writes
- **Staff account creation:** `POST /api/admin/staff` uses service-role client (auth.admin.createUser)

---

## Implementation status

Build follows **PRD Section 39** phase order. Current state on branch `feature/admin-completion-and-ux-polish`:

| Phase | Module | Status | Notes |
|-------|--------|--------|-------|
| **0** | Foundation | ✅ Done | Next.js, Supabase, schema, RLS, middleware, seed, auth |
| **1** | Public website + booking | ✅ Mostly done | All public routes exist; home/doctors/departments are polished; sitemap + robots present |
| **2** | Reception + OPD/walk-in | ✅ Mostly done | ReceptionBoard: approve/reject/reschedule/token/queue; walk-in form wired to RPC |
| **3** | Doctor dashboard | ✅ Done | Tabs, queue, notes, complete, follow-up via RPC |
| **4** | Patient status | ⚠️ Partial | Phone lookup works; reschedule/cancel uses WhatsApp link, not `request_reschedule_or_cancel` RPC |
| **5** | Lead CRM | ✅ Done | Admin + reception lead tables, manual add, filters |
| **6** | Owner analytics | ✅ Done | KPI cards + Recharts via analytics RPCs |
| **7** | Admin + polish | ⚠️ Partial | CRUD for doctors/depts/services/timings/staff/profile/content; gaps below |

### What works today (demo-ready)

- Full public website with sticky Call / WhatsApp / Book / Directions CTAs
- 30-second booking flow with Zod validation and honeypot
- Receptionist approval workflow with state machine enforcement
- Walk-in entry with token generation
- Doctor mobile-friendly queue
- Patient status lookup by phone
- Owner analytics dashboard
- Admin CRUD for hospital configuration
- Staff account creation API (owner creates receptionist/doctor logins)
- Super admin hospital list (read-only)

### Known gaps (before production-ready)

| Gap | PRD reference | Priority |
|-----|---------------|----------|
| Email notifications (`/api/notify` returns 501) | §25 | High |
| In-app notification bell / `notifications` table UI | §25 | High |
| `request_reschedule_or_cancel` RPC wired in status UI | §20, §30 | High |
| Language toggle on patient surfaces (`lib/i18n` exists but mostly unused) | §33 | Medium |
| Schema.org JSON-LD on public pages | §34 | Medium |
| Generated Supabase types (`types/supabase.ts` is placeholder) | §46 | Medium |
| Super admin: create/disable hospitals (currently list-only) | §16 | Medium |
| Contact form → lead creation | §15 | Medium |
| `analytics_events` tracking (call/WhatsApp clicks) | §28 | Low |
| Realtime on reception inbox (currently manual refresh) | §30 | Low |
| Privacy policy page + booking consent checkbox | §37 | Medium |
| `NEXT_PUBLIC_SITE_URL` for correct sitemap URLs | §34 | Low |
| Lighthouse / CWV performance pass | §36, §40 | Medium |

---

## What to build next

Work in this order to reach a **real utility** hospitals will pay for monthly:

### Sprint 1 — Close the notification loop (highest ROI)

Patients and receptionists need to know something happened without refreshing.

1. Implement `POST /api/notify` with Resend (or similar) — email hospital on new `pending` request
2. Add notification rows in `set_appointment_status` / `create_appointment_request` for key events
3. Add a bell icon in `StaffHeader` reading from `notifications` table
4. Trigger notify from booking route after successful RPC

**Done when:** Owner/receptionist gets email within 1 minute of a new booking; in-app bell shows unread count.

### Sprint 2 — Patient self-service (reduce repeat calls)

1. Wire `request_reschedule_or_cancel` in `StatusLookup` — in-app buttons, not just WhatsApp deep link
2. Show receptionist a "patient requested reschedule" indicator on ReceptionBoard
3. Pull arrival instructions from `settings` table (key: `arrival_instruction`) instead of hardcoded text

**Done when:** Patient can request cancel/reschedule from `/status`; receptionist sees the request.

### Sprint 3 — i18n + trust (adoption in Tier 2/3)

1. Add `LanguageToggle` to public layout; wire `lib/i18n` into booking form and status page
2. Add JSON-LD (`MedicalOrganization`, `Physician`, `FAQPage`) to public layout
3. Add privacy policy page + consent on booking form
4. Run Lighthouse mobile pass; fix LCP on home hero

**Done when:** Language toggle switches patient copy; structured data validates in Google Rich Results Test.

### Sprint 4 — Platform ops (scale beyond one hospital)

1. Super admin: create hospital form + owner invite flow
2. Generate real Supabase types: `npx supabase gen types typescript ...`
3. Add `lib/rpc/` wrappers for all RPCs (typed, reusable)
4. Deploy to Vercel with subdomain routing (`*.hospitalos.app`)

**Done when:** New hospital onboarded in under 1 day without code changes.

### Sprint 5 — Hardening

1. RLS integration tests (hospital A cannot read hospital B)
2. Edge cases from PRD §41 (duplicate bookings, concurrent receptionist actions)
3. Contact form → lead with source picker
4. Optional: Supabase Realtime subscription on reception board

---

## Local development setup

### Prerequisites

- Node.js 20+
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Environment

```bash
cp .env.local.example .env.local
```

Fill in from Supabase → Project Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG=sharma-hospital
```

### 2. Database

Schema is managed as **numbered migrations applied via the Supabase CLI / CI — never hand-pasted into the SQL Editor** (manual edits cause drift). See [`MIGRATIONS.md`](./MIGRATIONS.md) for the full discipline: PR → staging → merge → prod.

To bring a fresh database up to the current schema:

```bash
npx supabase login
npx supabase db push --db-url "<your-db-session-pooler-url>"
psql "<your-db-url>" -f supabase/seed.sql   # demo data (optional)
```

The seed creates **Sharma Multispeciality Hospital** (Kanpur) with 4 departments, 3 doctors, services, and testimonials.

### 3. Staff accounts

Auth users cannot be seeded via SQL. For each role:

1. Supabase Dashboard → Authentication → Add user (email + password)
2. Link to `public.users`:

```sql
insert into public.users (id, hospital_id, role, full_name, email, doctor_id)
values (
  '<auth_user_uuid>',
  '11111111-1111-1111-1111-111111111111',
  'owner',  -- or 'receptionist', 'doctor', 'super_admin'
  'Demo Owner',
  'owner@sharma-hospital.test',
  null  -- for doctor role: set to matching doctors.id
);
```

| Role | Email suggestion | `doctor_id` |
|------|------------------|-------------|
| owner | `owner@sharma-hospital.test` | `null` |
| receptionist | `reception@sharma-hospital.test` | `null` |
| doctor | `doctor@sharma-hospital.test` | Dr. Asthana's `doctors.id` |
| super_admin | `admin@hospitalos.test` | `null`, `hospital_id = null` |

### 4. Generate types (recommended)

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public > types/supabase.ts
```

### 5. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Public site:** uses `NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG`
- **Staff login:** [http://localhost:3000/login](http://localhost:3000/login) → redirects by role
- **Alternate tenant:** `http://localhost:3000?hospital=sharma-hospital`

### Quick smoke test

1. `/book` — submit appointment request
2. Login as receptionist → `/reception` — approve the request
3. Mark arrived → verify token number
4. Login as doctor → `/doctor` — see patient, mark completed
5. `/status?phone=<phone used>` — see confirmed status
6. Login as owner → `/admin/analytics` — see counts update

---

## Demo accounts and sales flow

Use the 5-minute demo in **PRD §43**:

1. Show the problem (missed calls, paper register)
2. Live book on phone (< 30 seconds)
3. Receptionist approves in 2 taps
4. Doctor sees queue on phone
5. Patient checks status without calling
6. Owner sees analytics + leads
7. Close: "fewer missed patients, full control on your phone"

Keep the demo on a **phone**, bilingual, outcome-led — never show code or database.

---

## Guidelines for developers and AI agents

### Before writing code

1. **Read `PRD.md`** for the module you're building — especially the acceptance criteria (§40).
2. **Check implementation status** above — don't rebuild what exists.
3. **Identify the phase** (§39) — don't skip ahead to WhatsApp/payments/EHR (explicitly out of MVP scope, §11).
4. **State assumptions** if the PRD is ambiguous; prefer the simpler implementation (§10, §38).

### How to implement a feature correctly

```
1. Schema / RPC first (if data changes needed)
   → supabase/migrations/ (new numbered file)
2. RLS policy (if new table or access pattern)
3. Zod schema in lib/validation/ (if form input)
4. Route handler or RPC wrapper in lib/rpc/
5. UI component (server component for reads, client for interactivity)
6. Verify against PRD §40 acceptance criteria
```

### Code conventions in this repo

- **Server Components** for data fetching on public and list pages
- **Client Components** (`"use client"`) for forms, dialogs, filters, charts
- **No `any`** — use `lib/types.ts` until generated Supabase types land
- **Shared status colors** — follow `STATUS_META` pattern in `reception-board.tsx`
- **Bilingual copy** — add keys to `lib/i18n/dictionaries.ts`, consume via `t(lang, key)`
- **Surgical diffs** — every changed line should trace to the task; no drive-by refactors

### What NOT to build (MVP guardrails)

- EHR / medical records
- Prescriptions, lab reports
- Payment gateway / UPI
- Teleconsultation
- Native mobile apps
- AI receptionist
- Multi-branch enterprise features

These are Phase 2+ (PRD §42). The MVP wins on **front-desk habit formation**.

### Testing checklist for any PR

- [ ] Multi-tenant: user from hospital A cannot see hospital B data
- [ ] Anon cannot `SELECT` from `patients` / `appointments` directly
- [ ] Status transitions invalid paths are rejected by RPC
- [ ] Booking creates exactly 1 appointment + 1 lead + deduped patient
- [ ] Doctor sees only own appointments
- [ ] Mobile layout usable at 360px width

---

## Deployment

**Target:** Vercel + Supabase (region near India: Mumbai or Singapore).

1. Push to GitHub; connect Vercel project
2. Set all env vars from `.env.local.example`
3. Set `NEXT_PUBLIC_SITE_URL` to production URL (for sitemap)
4. Configure wildcard subdomain `*.yourdomain.com` → Vercel
5. `middleware.ts` already resolves tenant from subdomain first label

Security headers are configured in `next.config.ts`.

---

## Key documents

| File | Purpose |
|------|---------|
| [`PRD.md`](./PRD.md) | Full product spec — modules, schema, RLS, phases, acceptance criteria |
| [`MIGRATIONS.md`](./MIGRATIONS.md) | Database migration discipline — numbered migrations, staging-first, CI, drift baseline |
| [`PILLAR.md`](./PILLAR.md) | First-principles goldmine features — pillar build order and agent implementation specs |
| [`Claude.md`](./Claude.md) | Coding discipline for humans and AI agents |
| [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) | Database schema + RLS |
| [`supabase/migrations/0002_rpcs.sql`](./supabase/migrations/0002_rpcs.sql) | Business logic RPCs |
| [`supabase/seed.sql`](./supabase/seed.sql) | Demo hospital data |

---

## Vision

> Build the default digital front desk for every small and mid-sized hospital in Bharat.

Hospital OS wins not by having the most features, but by being the **simplest system a non-technical receptionist will actually use every day**. Think big (multi-tenant platform, thousands of hospitals), execute small (ship MVP in weeks, add WhatsApp/SMS only after the core habit is formed).

When in doubt: **read the PRD, follow the phase order, ship the simpler version.**