# PILLAR.md — First-Principles Product Pillars

**Hospital OS economic engine: what to build, why it matters, and exactly how to code it.**

> This document translates first-principles strategy into **implementation specs for AI coding agents and developers**. It sits above feature tickets and below the full contract in [`PRD.md`](./PRD.md).
>
> - **PRD.md** = complete MVP spec (schema, routes, acceptance criteria)
> - **README.md** = architecture, setup, current status
> - **PILLAR.md** = the *goldmine features* that save users time and money — with build order and code hooks

**How agents should use this file:**

1. Read the [First Principles](#1-first-principles) and [Economic Loop](#2-the-economic-loop) before proposing features.
2. Pick the next [Pillar](#4-the-five-pillars) in [Build Order](#5-build-order-for-agents) — do not skip Tier S.
3. Implement using [Agent Implementation Rules](#6-agent-implementation-rules) and the pillar's **Code Hooks** section.
4. Verify against the pillar's **Definition of Done** before marking complete.
5. If a task is not in a pillar and not in PRD §10 MVP scope, **do not build it**.

---

## Table of Contents

1. [First Principles](#1-first-principles)
2. [The Economic Loop](#2-the-economic-loop)
3. [User Physics (Time & Money)](#3-user-physics-time--money)
4. [The Five Pillars](#4-the-five-pillars)
5. [Build Order for Agents](#5-build-order-for-agents)
6. [Agent Implementation Rules](#6-agent-implementation-rules)
7. [Anti-Pillars (Do Not Build)](#7-anti-pillars-do-not-build)
8. [Pillar → File Map](#8-pillar--file-map)
9. [Environment & Provider Config](#9-environment--provider-config)
10. [Sales Demo Alignment](#10-sales-demo-alignment)

---

## 1. First Principles

Strip away "hospital software." The product is a **demand capture and conversion machine** for a front desk that loses money when:

- The phone is busy → patient calls a competitor
- WhatsApp messages get buried → inquiry forgotten
- Paper register + memory → system breaks when staff is busy
- Patient doesn't know status → repeat calls clog reception
- No-show → doctor time burned
- Follow-up forgotten → repeat revenue never happens
- Owner is blind → bad spend on ads, wrong OPD timings

**One equation:**

```
Hospital Revenue ∝ Captured Demand × Approval Speed × Show-up Rate × Completed Consults × Return Visits
```

**Design test (non-negotiable):** Can a 45-year-old receptionist on the busiest Saturday OPD complete the action in **≤2 taps** without training?

**Musk / PayPal parallel:**

| Insight | Hospital OS application |
|---------|-------------------------|
| Identity on existing rails (email → phone) | **Phone = patient ID** — no passwords, no app |
| Meet users where money already moves | **WhatsApp + phone + Maps**, not a new login |
| Protocol-layer trust | **RLS + SECURITY DEFINER RPCs** (already built) |
| One pipe, many merchants | **Multi-tenant `hospital_id`** (already built) |
| 10× not 10% | Remove entire *classes* of calls (status, confirm, callback) |

---

## 2. The Economic Loop

Everything we build must strengthen this loop:

```
INQUIRY (call / WhatsApp / web / walk-in / Maps)
    → LEAD (nothing lost)
    → APPOINTMENT REQUEST (pending)
    → RECEPTION APPROVAL (human, fast)
    → CONFIRMATION (patient stops calling)
    → ARRIVAL + TOKEN (ordered OPD)
    → CONSULTATION → COMPLETED
    → FOLLOW-UP → RETURN VISIT
    → OWNER VISIBILITY (leaks = visible ₹)
```

**Already built (rails):** booking RPC, reception state machine, tokens, doctor queue, CRM, analytics RPCs, phone status lookup.

**Missing (engine):** notifications to close the loop, demand recovery from missed calls, owner habit, follow-up automation, patient self-service without WhatsApp workaround.

---

## 3. User Physics (Time & Money)

Use this table to prioritize. **ROI = money saved or recovered per hour of dev time.**

| User | Bottleneck | Time cost | Money cost | Pillar that fixes it |
|------|------------|-----------|------------|----------------------|
| Receptionist | Phone + WhatsApp + walk-in + register | 200 pts × 30s = **100 min/day** wasted | Lost patients while busy | P1 Capture, P2 Notify, P5 Queue |
| Patient | Uncertainty → repeat calls | 5 calls × 3 min reception | Churn to competitor | P2 Notify, P4 Follow-up |
| Doctor | Unordered waiting room | Idle or rushed minutes | Slot underutilization | P5 Queue (token — done) |
| Owner | No daily signal | Decisions delayed weeks | Wrong ads, blind to leaks | P3 Digest, P1 Capture metrics |
| SaaS operator | Churn | — | Owner stops paying | P3 Digest (daily habit) |

**Tier S pillars** attack the highest money leaks first: **missed demand** and **repeat status calls**.

---

## 4. The Five Pillars

### Pillar 1 — CAPTURE (Stop Demand Leaking)

**Promise:** Every inquiry becomes a lead — even when the phone was busy or WhatsApp was ignored.

**User outcome:** Hospital recovers patients who would have gone to a competitor. Owner sees *how many* were recovered.

#### Features

| Feature | What it does | Saves |
|---------|--------------|-------|
| **P1-A Missed-call → lead** | Telephony webhook on missed call → create `leads` row + send WhatsApp/SMS with `/book` link | Callback time + lost patients |
| **P1-B WhatsApp → lead (staff)** | Reception pastes phone / imports message → one-tap lead with source `whatsapp` | Buried chat inquiries |
| **P1-C Click tracking** | Log `call_click`, `whatsapp_click` on site to `analytics_events` | Owner source ROI |
| **P1-D Referral source on walk-in** | Required/quick-pick source on walk-in form (chemist, Instagram, doctor referral…) | Marketing optimization |

#### Code Hooks (existing)

| Asset | Location |
|-------|----------|
| `leads` table + `lead_source` enum | `supabase/migrations/0001_init.sql` |
| `analytics_events` + anon insert policy | `0001_init.sql` |
| Walk-in form | `components/reception/walk-in-form.tsx`, RPC `add_walk_in` |
| Leads table UI | `components/admin/admin-leads-table.tsx`, `components/reception/leads-table.tsx` |
| Sticky CTAs (call/WhatsApp) | `components/website/sticky-cta.tsx` |

#### Implementation Spec (agents)

**P1-A — Missed-call webhook**

```
New: app/api/webhooks/missed-call/route.ts
  - POST from provider (Exotel / Knowlarity / Twilio — configurable)
  - Validate webhook signature
  - Resolve hospital by phone number (add hospitals.inbound_phone or settings key)
  - INSERT lead: source='phone_call', status='new', phone=caller_id
  - INSERT analytics_events: event_type='missed_call_captured'
  - Call notify('missed_call_recovery', { phone, hospital_id, lead_id })
  - Return 200

New migration (if needed): settings key 'missed_call_message_hi' / provider config per hospital

Optional RPC: create_lead_from_missed_call(payload jsonb) — security definer, called by webhook via service role
```

**P1-B — Quick-add WhatsApp lead**

```
Extend: components/reception/leads-table.tsx or new components/reception/add-lead-dialog.tsx
  - Fields: name, phone, source (default whatsapp), department, notes
  - INSERT into leads (authenticated, RLS allows receptionist)
  - No new RPC required for MVP if RLS permits staff insert on leads
```

**P1-C — Click tracking**

```
New: lib/analytics/track-event.ts
  - trackEvent(hospitalId, eventType, metadata)
  - Client: fire on Call/WhatsApp button click in sticky-cta.tsx, site-header.tsx
  - Server: optional route POST /api/events for SSR pages

INSERT analytics_events — policy anon_insert_site_events already exists
```

**P1-D — Referral source on walk-in**

```
Extend: lib/validation/walk-in.ts — add optional source field
Extend: add_walk_in RPC payload to accept source (default walk_in)
Extend: walk-in-form.tsx — quick-pick chips: Walk-in, Referral, Google Maps, Instagram, Other
```

#### Definition of Done (P1)

- [ ] Missed call to test number creates a `leads` row with `source=phone_call` within 30s
- [ ] Patient receives WhatsApp/SMS with working `/book` link (bilingual template)
- [ ] Reception can create WhatsApp lead in ≤3 taps
- [ ] Call/WhatsApp clicks appear in `analytics_events` and owner analytics by source
- [ ] Walk-in can tag referral source; visible in CRM filters
- [ ] No PII exposed cross-tenant; webhook uses service role server-only

---

### Pillar 2 — NOTIFY (Kill Repeat "Confirm Hai?" Calls)

**Promise:** Patient and staff know what happened without refreshing or calling.

**User outcome:** 30–50% fewer status calls. Reception gets alerted on new requests without staring at screen.

#### Features

| Feature | What it does | Saves |
|---------|--------------|-------|
| **P2-A `notify()` abstraction** | Single service: `notify(event, payload)` → in-app + email + WhatsApp/SMS | Channel sprawl |
| **P2-B In-app notification bell** | Staff reads `notifications` table — unread count in header | Missed requests |
| **P2-C Patient WhatsApp on approve** | On `assign_appointment` / approve: WhatsApp confirmation bilingual | Repeat calls |
| **P2-D Reminders** | 24h + 2h before appointment (cron/edge function) | No-shows |
| **P2-E Wire patient reschedule/cancel** | UI calls existing `request_reschedule_or_cancel` RPC | WhatsApp-only workaround removed |

#### Code Hooks (existing)

| Asset | Location |
|-------|----------|
| `notifications` table + RLS | `0001_init.sql` |
| Notifications inserted in RPCs | `create_appointment_request`, `set_appointment_status`, `request_reschedule_or_cancel` in `0002_rpcs.sql` |
| Stub notify endpoint | `app/api/notify/route.ts` (returns 501) |
| `hospitals.notification_email` | seed + admin profile form |
| Status UI (WhatsApp workaround) | `components/patient/status-lookup.tsx` — replace deep link with RPC |
| Staff header (no bell yet) | `components/common/staff-header.tsx` |

#### Implementation Spec (agents)

**P2-A — notify() service**

```
New: lib/notify/index.ts
  - type NotifyEvent = 'new_request' | 'appointment_approved' | 'appointment_reminder' | 'missed_call_recovery' | 'follow_up_due' | 'owner_digest' | ...
  - async function notify(event: NotifyEvent, payload: NotifyPayload): Promise<void>
  - Channels (try in order, config per hospital settings):
      1. insert notifications row (always)
      2. email via Resend if notification_email set
      3. WhatsApp/SMS via provider if phone set (Phase 2b)

Implement: app/api/notify/route.ts
  - POST { event, payload } — internal only (secret header or server-side calls only)
  - Never expose provider API keys to client

Call notify() from:
  - app/api/booking/route.ts after successful RPC
  - New DB trigger OR extend assign_appointment / set_appointment_status RPCs to call edge function
  - Prefer: server-side after RPC in route handlers and server actions to avoid DB→HTTP complexity in MVP
```

**P2-B — In-app bell**

```
Extend: components/common/staff-header.tsx
  - Fetch unread count: notifications where (user_id = me OR target_role = my role) AND is_read = false
  - Dropdown list with mark-as-read on click
  - Link entity to /reception or /admin/appointments

New: components/common/notification-bell.tsx (client component, polls every 30s or Supabase Realtime optional)
```

**P2-C — WhatsApp templates (bilingual)**

```
Templates in lib/notify/templates.ts — Hinglish + English:

  approved: "✅ {hospital}: Appointment confirm! Dr. {doctor}, {date} {time}. Kripya 15 min pehle aayein. Status: {statusUrl}"

  new_request (to hospital email): keep short

Store: hospitals.whatsapp for wa.me links; use WhatsApp Business API for outbound (not wa.me) in production
```

**P2-D — Reminders**

```
New: supabase/functions/appointment-reminders (or Vercel cron hitting app/api/cron/reminders)
  - Query appointments: status=approved, confirmed_date = tomorrow / today+2h
  - notify('appointment_reminder', ...)
  - Idempotency: settings flag or reminder_sent_at column on appointments (new migration)

Migration: appointments.reminder_24h_sent_at timestamptz, reminder_2h_sent_at timestamptz
```

**P2-E — Patient reschedule/cancel**

```
Extend: components/patient/status-lookup.tsx
  - Replace WhatsApp-only link with buttons: "Request Reschedule" / "Request Cancel"
  - Modal: reason / preferred date
  - POST app/api/status/request OR direct supabase.rpc('request_reschedule_or_cancel', ...)
  - Show success: "Request bhej di gayi — reception jald contact karegi"

Reception: highlight appointments with recent internal_notes containing [Patient request:
  OR filter notifications type reschedule_request / cancellation_request
```

#### Definition of Done (P2)

- [ ] `POST /api/notify` works for `new_request` and `appointment_approved` (email minimum)
- [ ] Bell shows unread count; marking read persists
- [ ] New booking creates notification row (already in RPC) AND triggers email to `notification_email`
- [ ] Approved appointment sends patient confirmation (WhatsApp or SMS if configured, else email/SMS fallback documented)
- [ ] Patient can request reschedule/cancel from `/status` via RPC; reception sees notification
- [ ] Reminder cron documented and testable locally
- [ ] All templates bilingual; no hardcoded strings outside `lib/notify/templates.ts` and `lib/i18n/`

---

### Pillar 3 — DIGEST (Owner Daily Habit = Retention)

**Promise:** Owner sees hospital performance in 10 seconds every morning — without opening a dashboard.

**User outcome:** SaaS retention.up — owner *feels* the product daily. Lost leads become visible ₹.

#### Features

| Feature | What it does | Saves |
|---------|--------------|-------|
| **P3-A Morning WhatsApp digest** | 8 AM message: requests, completed, no-shows, pending leads, busiest doctor/dept | Owner analysis paralysis |
| **P3-B Lost lead ₹ estimate** | `lost_count × assumed_ticket` in analytics | Sells subscription ROI |
| **P3-C Call list for reception** | Today's leads where status in (`new`,`contacted`) and follow_up_date <= today | Structured follow-up |

#### Code Hooks (existing)

| Asset | Location |
|-------|----------|
| Analytics RPCs | `analytics_overview`, `analytics_by_doctor`, `analytics_by_source` in `0002_rpcs.sql` |
| Analytics UI | `components/admin/analytics-dashboard.tsx` |
| Owner phone | `users.phone` or new `hospitals.owner_whatsapp` in settings |
| Leads CRM | `admin-leads-table.tsx`, filters for follow-up |

#### Implementation Spec (agents)

**P3-A — Owner digest**

```
New: lib/notify/digest.ts
  - buildOwnerDigest(hospitalId): calls analytics_overview(for yesterday) + pending leads count
  - Format ≤5 lines WhatsApp-friendly

New: app/api/cron/owner-digest/route.ts
  - Secured with CRON_SECRET
  - For each active hospital: notify('owner_digest', { phone: owner_whatsapp, text })

Settings (hospitals or settings table):
  - owner_whatsapp, digest_enabled (default true), assumed_ticket_size (default 400)
```

**P3-B — Lost lead money card**

```
Extend: components/admin/analytics-dashboard.tsx
  - Card: "Estimated lost revenue" = leads.status in ('lost','not_interested') × ticket size
  - Ticket size from settings key 'assumed_ticket_size' (owner editable in admin profile)
```

**P3-C — Call list**

```
New: app/reception/follow-ups/page.tsx OR tab on reception/leads
  - Query: leads where follow_up_date <= today AND status not in (converted, lost, not_interested)
  - Click-to-call tel: link, one-tap status → contacted
```

#### Definition of Done (P3)

- [ ] Owner with `owner_whatsapp` set receives digest at cron time (test endpoint for manual trigger)
- [ ] Digest numbers reconcile with `analytics_overview` for same date range
- [ ] Lost revenue card shows on `/admin/analytics` and uses configurable ticket size
- [ ] Reception follow-up list shows due leads with click-to-call
- [ ] Digest opt-out in admin settings

---

### Pillar 4 — RETURN (Follow-Up = Repeat Revenue)

**Promise:** Follow-up patients come back without reception chasing them.

**User outcome:** Repeat OPD revenue with near-zero marginal effort.

#### Features

| Feature | What it does | Saves |
|---------|--------------|-------|
| **P4-A Follow-up reminder** | When doctor sets `follow_up_date`, schedule reminder at T-1 day | Manual recall calls |
| **P4-B One-link rebook** | WhatsApp/link with `?doctor=&dept=&phone=` pre-filled on `/book` | Patient friction |
| **P4-C Returning patient memory** | On booking/walk-in: show last visit date, doctor, complaint | Reception re-asking |

#### Code Hooks (existing)

| Asset | Location |
|-------|----------|
| `follow_up_date` on appointments | schema + doctor-queue.tsx |
| `set_appointment_status` → `follow_up_required` | `0002_rpcs.sql` |
| Lead sync on status change | inside `set_appointment_status` |
| Booking form | `components/booking/booking-form.tsx` — accepts query params |
| Patient dedupe by phone | `create_appointment_request`, `add_walk_in` |

#### Implementation Spec (agents)

**P4-A — Follow-up reminder**

```
On set_appointment_status when meta includes follow_up_date OR status = follow_up_required:
  - Update lead.follow_up_date
  - notify('follow_up_due', { patient_phone, date, hospital_id })

Cron: same as P2-D — query leads where follow_up_date = tomorrow
```

**P4-B — Rebook link**

```
New: lib/utils/rebook-url.ts
  - buildRebookUrl(hospital, { phone, department_id, doctor_id })
  - Returns /book?phone=...&department=...&doctor=...

Extend: booking-form.tsx — read searchParams, prefill RHF defaults

Include link in follow-up WhatsApp template
```

**P4-C — Returning patient card**

```
New RPC (optional): get_patient_history(phone, hospital_id) returns last appointment safe fields
  OR extend create_appointment_request response when phone matches existing patient

UI: reception walk-in-form + booking confirmation shows "Returning patient — last visit {date}"
```

#### Definition of Done (P4)

- [ ] Doctor setting follow-up updates lead and schedules reminder
- [ ] Patient receives reminder with working pre-filled rebook link
- [ ] Rebook completes in <30s with pre-filled phone/dept/doctor
- [ ] Walk-in/booking shows previous visit info when phone exists
- [ ] No extra PHI exposed beyond name, last date, last doctor, last problem

---

### Pillar 5 — SPEED (Reception 10× During OPD Peak)

**Promise:** Fewer taps, fewer mistakes, when 200 patients are waiting.

**User outcome:** 30 seconds saved × 200 patients = **100 minutes/day** back.

#### Features

| Feature | What it does | Saves |
|---------|--------------|-------|
| **P5-A Smart approve defaults** | "Any doctor" → suggest least-loaded doctor in dept today | Assignment time |
| **P5-B Phone last-4 search** | Search appointments/leads by last 4 digits | Hindi name mismatch |
| **P5-C Queue mode UI** | Full-screen today queue: Pending inbox / Arrived / Token — minimal chrome | Navigation overhead |
| **P5-D Patient request badges** | Visual flag on cards with pending reschedule/cancel notification | Missed patient requests |

#### Code Hooks (existing)

| Asset | Location |
|-------|----------|
| Reception board | `components/reception/reception-board.tsx` |
| `assign_appointment` RPC | `0002_rpcs.sql` |
| Search by name/phone | reception-board.tsx (extend) |

#### Implementation Spec (agents)

**P5-A — Smart defaults**

```
New RPC or query in assign flow:
  suggest_doctor_for_department(hospital_id, department_id, date)
  - COUNT appointments where status in (approved, arrived, in_consultation) GROUP BY doctor_id
  - RETURN doctor_id with minimum count for that dept/date

Extend: Approve modal in reception-board.tsx
  - When doctor_id null, pre-select suggested doctor
  - Owner can disable via settings 'smart_assign_enabled'
```

**P5-B — Last-4 search**

```
Extend: reception-board.tsx search filter
  - If query length = 4 and all digits: match patients.phone ends with query
  - Else: existing name/phone contains logic
```

**P5-C — Queue mode**

```
New route: app/reception/queue/page.tsx (optional) OR view toggle on reception/page.tsx
  - Default tab "Today" — large cards, primary actions only
  - Hide leads nav during queue mode — link back in header

Mobile: 44px+ touch targets (PRD §32)
```

**P5-D — Request badges**

```
Extend: reception-board.tsx appointment card
  - Join or subquery notifications where entity_id = appointment.id and type in (reschedule_request, cancellation_request) and is_read = false
  - Badge: "Patient requested change"
```

#### Definition of Done (P5)

- [ ] Approve with "any doctor" pre-fills suggested doctor (verified against load query)
- [ ] Last-4 phone search finds patient in <1s on seeded data
- [ ] Queue view usable on 360px width; approve in ≤2 taps
- [ ] Reschedule/cancel requests visible on board without opening notifications dropdown
- [ ] No regression on appointment state machine

---

## 5. Build Order for Agents

**Do not parallelize Tier S pillars across conflicting files without merging plan.**

| Order | Pillar | Task ID | Effort | Depends on |
|-------|--------|---------|--------|------------|
| 1 | P2 | P2-A, P2-B, P2-E | M | — |
| 2 | P2 | P2-C email confirm (WhatsApp optional) | M | P2-A |
| 3 | P5 | P5-D, P5-B | S | P2-E |
| 4 | P3 | P3-B, P3-C | S | — |
| 5 | P3 | P3-A digest | M | P2-A |
| 6 | P4 | P4-B, P4-C | M | P2-C |
| 7 | P4 | P4-A reminders | M | P2-D |
| 8 | P2 | P2-D reminder cron | M | P2-A |
| 9 | P1 | P1-C click tracking | S | — |
| 10 | P1 | P1-D referral source | S | — |
| 11 | P1 | P1-B WhatsApp quick lead | S | — |
| 12 | P5 | P5-A smart assign | M | — |
| 13 | P5 | P5-C queue mode | L | P5-D |
| 14 | P1 | P1-A missed-call webhook | L | P2-A, provider account |

**Effort:** S = hours, M = 1–2 days, L = 3+ days (provider integration)

**Rationale:** Notify + patient self-service first (closes existing loop). Digest + follow-up (retention + repeat revenue). Capture last (needs telephony provider) but highest long-term ROI.

---

## 6. Agent Implementation Rules

### Before coding

1. Read `PRD.md` §10 (MVP scope), §29 (RLS), §30 (RPCs).
2. Read `README.md` [Implementation status](./README.md#implementation-status).
3. Confirm task maps to a pillar above — if not, stop and ask.

### Coding order (same as PRD)

```
1. Migration (if schema change) → supabase/migrations/0003_pillar_*.sql
2. RPC (if business logic) → security definer + grants + state machine respect
3. RLS policy (if new table/access)
4. lib/notify or lib/analytics helper
5. API route (thin) or server action
6. UI component
7. i18n keys in lib/i18n/dictionaries.ts
```

### Non-negotiables

- **No service role key in client components**
- **No anon direct insert to patients/appointments/leads** — use RPC or authenticated RLS
- **All status changes via `set_appointment_status` or `assign_appointment`**
- **Bilingual patient-facing strings** in `lib/i18n` or `lib/notify/templates.ts`
- **Surgical diffs** — one pillar task per PR where possible
- **Extend `notify()`** — never hardcode Resend/WhatsApp in random components

### Testing checklist (every pillar PR)

- [ ] Multi-tenant isolation verified
- [ ] Receptionist can complete primary action in ≤2 taps (manual or documented)
- [ ] Patient-facing copy is Hinglish + English
- [ ] Error states: network fail, invalid phone, missing provider config
- [ ] `npm run build` passes
- [ ] Definition of Done for that pillar task is checked off

### Commit message format

```
pillar(P2): implement notify() and notification bell

- lib/notify/index.ts abstraction
- wire /api/notify + booking route
- notification bell in staff-header

Closes P2-A, P2-B
```

---

## 7. Anti-Pillars (Do Not Build)

Agents must reject these unless explicitly removed from PRD:

| Request | Why reject |
|---------|------------|
| Full EHR / prescriptions | Different product; kills adoption |
| Patient native app | Maps + WhatsApp + web is the app |
| Auto-confirm appointments | Indian OPD needs human approval |
| AI receptionist (v1) | Trust + staff resistance |
| 20-widget owner dashboard | Owner won't look; use digest |
| Complex slot grid | Morning/Evening enough for MVP |
| Payment gateway before notify works | Habit before monetization friction |
| Multi-branch | Post product-market fit |

**Filter question:** *Does this remove a bottleneck in Inquiry → Visit → Return?* If no, don't build.

---

## 8. Pillar → File Map

Quick reference for agents — where to work:

| Pillar | New files (expected) | Extend existing |
|--------|----------------------|-----------------|
| P1 Capture | `app/api/webhooks/missed-call/route.ts`, `lib/analytics/track-event.ts` | `walk-in-form.tsx`, `sticky-cta.tsx`, `leads-table.tsx` |
| P2 Notify | `lib/notify/index.ts`, `lib/notify/templates.ts`, `components/common/notification-bell.tsx`, `app/api/cron/reminders/route.ts` | `app/api/notify/route.ts`, `app/api/booking/route.ts`, `status-lookup.tsx`, `staff-header.tsx` |
| P3 Digest | `lib/notify/digest.ts`, `app/api/cron/owner-digest/route.ts` | `analytics-dashboard.tsx`, `admin-profile-form.tsx`, `reception/leads` |
| P4 Return | `lib/utils/rebook-url.ts`, optional `get_patient_history` RPC | `doctor-queue.tsx`, `booking-form.tsx`, `walk-in-form.tsx` |
| P5 Speed | `app/reception/queue/page.tsx` (optional) | `reception-board.tsx`, `0002_rpcs.sql` (suggest doctor) |

---

## 9. Environment & Provider Config

Add to `.env.local.example` as pillars are implemented:

```env
# P2 — Email (Resend)
RESEND_API_KEY=
NOTIFY_FROM_EMAIL=notifications@yourdomain.com

# P2/P3 — WhatsApp Business (e.g. Interakt, AiSensy, Gupshup, Twilio)
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER_ID=

# P2/P3 — SMS fallback
SMS_API_KEY=

# P1 — Missed call provider
MISSED_CALL_WEBHOOK_SECRET=
EXOTEL_API_KEY=          # or provider of choice

# Cron routes
CRON_SECRET=

# P3 — Owner digest
DEFAULT_ASSUMED_TICKET_SIZE=400
```

**Per-hospital overrides** go in `settings` table (PRD §28), not env — env is platform-level keys only.

---

## 10. Sales Demo Alignment

Each pillar maps to a line the owner understands (PRD §43):

| Pillar | Demo line (Hinglish) |
|--------|----------------------|
| P1 Capture | "Phone busy tha — patient phir bhi lead ban gaya, link chala gaya." |
| P2 Notify | "Confirm WhatsApp pe aa gayi — patient dobara call nahi karega." |
| P3 Digest | "Subah 8 baje aapko poora hisaab WhatsApp pe — kitne aaye, kitne miss." |
| P4 Return | "Follow-up patient ko link gaya — ek tap me dubara book." |
| P5 Speed | "Reception ne 2 tap me approve kiya — queue chal rahi hai." |

**Demo order:** P2 → P5 → P1 → P3 → P4 (same as build order for *demo script*, build order above is for *engineering*).

---

## Summary for Agents

**Hospital OS goldmines are not more modules.** They are:

1. **CAPTURE** — nothing leaks (missed calls → leads)
2. **NOTIFY** — nobody wonders (WhatsApp confirm + bell)
3. **DIGEST** — owner sees daily (retention)
4. **RETURN** — follow-ups come back (repeat ₹)
5. **SPEED** — reception survives OPD (2-tap approve)

The codebase already has the PayPal layer: multi-tenant Postgres, RPC state machine, CRM, analytics. **Your job is to close the last mile to WhatsApp, phone, and the owner's pocket.**

When stuck: re-read [§1 First Principles](#1-first-principles) and pick the smallest change that removes a whole class of phone calls.

---

*PILLAR.md complements PRD.md. If PILLAR and PRD conflict on MVP scope, PRD wins. If PILLAR adds economic priority between two PRD tasks, PILLAR wins.*