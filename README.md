# builtbyjawad — Outreach Portal

Next.js app for running cold outreach: leads, an initial email draft, and as many follow-ups as you want per lead, fully branded (navy/paper/green, Space Grotesk + Inter).

**Live:** https://portal-built-by-jawad.vercel.app (Vercel deployment protection is on — you need to be logged into the `built-by-jawad` Vercel team to open it).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Prisma 5 + Postgres (Supabase project `Portal`, `uoevfpnpnaspzgqceddm`)
- Tailwind CSS v4
- Deployed on Vercel (`built-by-jawad/portal`), auto-builds on push to `main`

## Getting started (local dev)

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL from Supabase project settings → Database
npm run db:migrate       # applies prisma/migrations to whichever database DATABASE_URL points at
npm run dev                # http://localhost:3000
```

Local dev and production currently point at the **same Supabase database** — there's no separate local database. Be mindful when testing locally; anything you add shows up on the live site too. If you want an isolated local database, point `DATABASE_URL`/`DIRECT_URL` in `.env` at a separate Supabase project (or local Postgres) instead.

## What's here

- **Dashboard** (`/`) — lead counts, emails sent this 7 days, and a queue of the next unsent email steps.
- **Leads** (`/leads`) — full list, filterable by status.
- **Add Lead** (`/leads/new`) — business info + "leak spotted" notes (for your own reference when writing outreach). On save, an empty Initial Email is created for the lead.
- **Lead detail** (`/leads/[id]`) — tabbed emails: Initial Email plus as many Follow-up 1, 2, 3... tabs as you add via "+ Add follow-up". Each is independently editable, with "Mark as sent" (stamps the time and, for the first email sent, advances the lead's status to Contacted) and "Remove" (on follow-ups only — the initial email can't be deleted, just edited).

There is no templates page — every email is written directly on the lead, from scratch.

## Data model (`prisma/schema.prisma`)

- `Lead` — one business being pursued (contact info, trade, status, leak notes).
- `EmailStepRecord` — one row per email in a lead's sequence, ordered by `order` (0 = Initial Email, 1+ = Follow-up N), holding the drafted subject/body and `sentAt`. Follow-ups are added and removed freely — there's no fixed count.

`status` and `trade` are plain strings (not Postgres enums) validated against the lists in `src/lib/constants.ts` — this schema started on SQLite (no enum support) and there was no reason to churn it when moving to Postgres.

## Deploying changes

`npm run build` runs `prisma migrate deploy` before `next build`, so pushing a commit with a new migration to `main` applies it automatically on Vercel. To change the schema:

```bash
# edit prisma/schema.prisma, then:
npm run db:migrate   # creates a new migration file AND applies it to the database DATABASE_URL points at (shared with prod, see above)
git add -A && git commit && git push
```

## Notes

- This sends nothing itself — it's a drafting/tracking tool. Copy the subject/body into whatever you actually send from (Gmail, etc.) and click "Mark as sent" here.
- `DATABASE_URL` (port 6543, `pgbouncer=true`) is the pooled connection used at runtime. `DIRECT_URL` (port 5432) is the direct/session connection Prisma Migrate uses for schema changes — both are required in `.env` and are set on Vercel (Production/Preview/Development).
- Vercel deployment protection is on by default for this project (private leads data) — that's intentional, not a bug.
