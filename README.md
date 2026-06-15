# Hospital OS

Multi-tenant hospital management platform (Next.js 15 + Supabase). See `PRD.md` for the full spec.

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API
- `NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG` — leave as `sharma-hospital` to match the seed data

### 2. Run database migrations + seed data

In the Supabase SQL Editor (or via `supabase db push` / `psql`), run in order:

1. `supabase/migrations/0001_init.sql` — enums, tables, RLS policies, helper functions
2. `supabase/migrations/0002_rpcs.sql` — RPC functions (booking, status lookup, analytics, etc.)
3. `supabase/seed.sql` — demo hospital "Sharma Multispeciality Hospital" with departments, doctors, services, testimonials

### 3. Create staff login accounts

The seed data creates hospital/department/doctor rows but not auth users (Supabase Auth users must be created via the Auth UI/API). For each staff member you want to log in as:

1. In Supabase Dashboard → Authentication → Users, create a user with email + password.
2. Insert a matching row into `public.users` linking that auth user to the seeded hospital/role/doctor — see the commented example at the bottom of `supabase/seed.sql`.

Suggested demo accounts: one `owner`, one `receptionist`, one `doctor` (linked to a seeded doctor row), and one `super_admin` (with `hospital_id = null`).

### 4. Generate Supabase types (optional but recommended)

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public > types/supabase.ts
```

This replaces the `any` placeholder in `types/supabase.ts` with real types.

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public site uses `NEXT_PUBLIC_DEFAULT_HOSPITAL_SLUG` on localhost; staff dashboards (`/admin`, `/reception`, `/doctor`, `/super`) require login at `/login` and route based on the logged-in user's role.
