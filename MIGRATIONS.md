# Database migrations & staging discipline

**The rule:** every schema change ships as a numbered migration in `supabase/migrations/`, gets applied to **staging** first, is verified there, and only then reaches **production** — automatically, on merge to `main`. Nobody pastes SQL into the Supabase SQL Editor anymore. Manual edits are what caused the drift documented in `0004_patient_email.sql`.

```
write migration  ->  open PR  ->  CI applies to STAGING  ->  verify on staging app
                                                                      |
                                                                  merge to main
                                                                      v
                                                   CI re-applies to staging, then PROD
```

---

## How it works

- `supabase/migrations/*.sql` — the only source of truth for schema. Ordered by filename.
- `supabase/config.toml` — marks this as a Supabase project so the CLI works.
- `.github/workflows/supabase-migrations.yml` — the gate:
  - **PR** touching `supabase/migrations/**` → `supabase db push` to **staging**.
  - **Merge to `main`** → push to staging again (idempotent), then **prod** (`production` job `needs: staging`, so prod never runs if staging fails).
- Supabase tracks which migrations a database has already run in its `supabase_migrations.schema_migrations` table, so `db push` only applies *new* files. That table is why the one-time baseline below matters.

---

## One-time setup (you do this once)

### 1. GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `STAGING_DB_URL` | Staging project **Session pooler** connection string |
| `PROD_DB_URL` | Production project **Session pooler** connection string |

Get each from Supabase → **Project Settings → Database → Connection string → Session pooler**. It looks like:

```
postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> ⚠️ **Use the Session pooler (port 5432), not Direct (IPv6) or Transaction pooler (6543).** GitHub Actions runners are IPv4-only; the direct connection is IPv6 and will time out. The transaction pooler can't run migration transactions.
>
> ⚠️ **Percent-encode special characters in the password** (`@`→`%40`, `#`→`%23`, `/`→`%2F`, etc.), or the URL parses wrong.

*(Optional, recommended)* Add a **required reviewer** to the `production` environment (Settings → Environments → production) so prod migrations need a human approval click even after staging passes.

### 2. Local CLI (only needed for `db:diff` / `db:types`)

```bash
npx supabase login            # opens browser, stores access token
npx supabase link --project-ref <staging-ref>
```

You don't need this just to write migrations — only to generate types or diff against a live DB.

---

## One-time drift baseline (do this before relying on CI)

Right now the repo migrations (`0001`–`0004`) don't reproduce prod — `0004` says so. Until we baseline, CI can't safely push, because Supabase's history table on prod is probably empty (everything was pasted by hand), so `db push` would try to re-run `0001` and collide with existing objects.

This makes the repo, staging, and prod agree. **You run these** (they need the DB passwords; I can't handle those).

```bash
# 0. Authenticate
npx supabase login

# 1. Capture prod's REAL schema as the new baseline.
#    (Quote the URL. Use the Session pooler string for prod.)
npx supabase db dump --db-url "$PROD_DB_URL" -f supabase/migrations/00000000000000_baseline.sql

# 2. Move the old, now-superseded migrations out of the push path.
mkdir -p supabase/migrations-archive
git mv supabase/migrations/0001_init.sql        supabase/migrations-archive/
git mv supabase/migrations/0002_rpcs.sql        supabase/migrations-archive/
git mv supabase/migrations/0003_security.sql    supabase/migrations-archive/
git mv supabase/migrations/0004_patient_email.sql supabase/migrations-archive/

# 3. Tell PROD's history: the old files are gone, the baseline is already applied
#    (so CI won't try to re-run anything that's already in prod).
npx supabase migration repair --db-url "$PROD_DB_URL" --status reverted 0001 0002 0003 0004
npx supabase migration repair --db-url "$PROD_DB_URL" --status applied 00000000000000

# 4. Make STAGING an exact mirror of prod, then mark its history the same way.
#    Easiest reliable clone: dump prod and load into staging.
npx supabase db dump --db-url "$PROD_DB_URL" -f /tmp/prod-schema.sql
psql "$STAGING_DB_URL" -f /tmp/prod-schema.sql        # run only if staging is empty/fresh
npx supabase migration repair --db-url "$STAGING_DB_URL" --status applied 00000000000000

# 5. Confirm both databases report the same, fully-applied history.
npx supabase migration list --db-url "$PROD_DB_URL"
npx supabase migration list --db-url "$STAGING_DB_URL"
```

> Rename the baseline file's `00000000000000` prefix to the actual UTC timestamp the dump suggests if you prefer; just keep the same value consistent in steps 1, 3, 4, and 5. The archived files in `supabase/migrations-archive/` are kept for history and are **not** scanned by the CLI.

After this, prod = staging = repo. Commit the baseline + the archive move.

---

## Daily workflow (every schema change from now on)

```bash
# 1. New migration file (timestamped). Then edit the .sql it creates.
npm run migration:new -- add_consent_to_patients

# 2. (Optional) sanity-check the SQL.
npm run db:lint

# 3. Commit on a branch and open a PR.
git checkout -b db/add-consent
git add supabase/migrations && git commit -m "db: add consent column to patients"
git push -u origin db/add-consent && gh pr create
```

- CI applies it to **staging**. Open the staging app, exercise the affected feature.
- **Green + verified → merge.** CI applies it to prod.
- After a schema change lands, refresh types: `npm run db:types` (needs `supabase link`), commit `types/supabase.ts`.

### Rules

- ✅ Forward-only. To undo, write a **new** migration that reverses the change.
- ✅ Make migrations idempotent where cheap (`if not exists`, `create or replace`) — `0004` is a good model.
- ❌ Never edit a migration that's already merged/applied. Add a new one.
- ❌ Never run DDL in the Supabase SQL Editor against prod or staging. That's how drift returns.
- ❌ Never push straight to `main` skipping the PR → staging step for anything touching `supabase/migrations/**`.

---

## npm scripts

| Script | Does |
|--------|------|
| `npm run migration:new -- <name>` | Create a new timestamped migration file |
| `npm run db:lint` | Lint pending migration SQL |
| `npm run db:diff` | Diff a local/shadow DB into a migration (needs Docker) |
| `npm run db:types` | Regenerate `types/supabase.ts` from the linked project |

Pushing to staging/prod is intentionally **not** an npm script — that's CI's job, so a stray local command can't bypass the staging gate.
