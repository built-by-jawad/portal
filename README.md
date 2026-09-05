# builtbyjawad — Outreach Portal

Next.js app for running cold outreach: leads, an initial email draft, and as many follow-ups as you want per lead, fully branded (navy/paper/green, Space Grotesk + Inter).

**Live:** https://portal-built-by-jawad.vercel.app (Vercel deployment protection is on — you need to be logged into the `built-by-jawad` Vercel team to open it).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Prisma 5 + Postgres (Supabase project `Portal`, `uoevfpnpnaspzgqceddm`)
- Tailwind CSS v4
- Gmail API (`googleapis`) via OAuth — Google Cloud project `builtbyjawad-portal`, its own project, separate from any other Google Workspace integration
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
- **Add Lead** (`/leads/new`) — business info (name, contact, email, phone, website, trade, full address) plus optional leak notes/internal notes, **and the full email sequence right there**: an Initial Email plus as many Follow-up tabs as you add via "+ Add follow-up" before you've even saved the lead, each with its own body, a send date/time/timezone, and an "Include a subject line" checkbox (checked by default on the Initial Email, unchecked by default on follow-ups — unchecked means it replies in the same thread instead of starting a new one).
- **Lead detail** (`/leads/[id]`) — same tabbed email editor, still add/remove follow-ups freely. If Gmail is connected and the lead has an email address, **"Send via Gmail"** actually sends it (threaded as a reply if it's a follow-up), embeds an open-tracking pixel, and stamps `sentAt` + advances the lead's status to Contacted on the first send. "Mark as sent manually" is the fallback for anything sent outside the system. A scoped **Inbox** section shows only Gmail messages to/from that lead's own email address — never a general inbox.
- **Analytics** (`/analytics`) — total sent/opened, open rate, breakdown by email step, recent activity feed, all live (not cached).
- **Settings** (`/settings`) — connect/disconnect the Gmail account the portal sends from and reads scoped inbox messages through.

There is no templates page — every email is written directly on the lead, from scratch.

Timezone doesn't need to be picked by hand: leaving it on "Auto-detect from address" fills it in server-side from the lead's address (via a US state → timezone lookup in `src/lib/timezone.ts`) whenever a lead is created or a follow-up is added. It's a best-effort guess from free-text address, not a geocoding API — always fine to override manually if it's wrong or the address is ambiguous/non-US.

## Data model (`prisma/schema.prisma`)

- `Lead` — one business being pursued: contact info, trade, full `address` (no separate city/state/source fields), status, leak notes.
- `EmailStepRecord` — one row per email in a lead's sequence, ordered by `order` (0 = Initial Email, 1+ = Follow-up N). Holds `hasSubject` (whether this email shows a subject line vs. replying in-thread) alongside subject/body, the planned `scheduledDate`/`scheduledTime` (entered by hand) and `scheduledTimezone` (hand-entered or auto-guessed from the lead's address — see above), `sentAt` (set on send, either real via Gmail or "Mark as sent manually"), `gmailThreadId`/`gmailMessageId` (set once actually sent via Gmail, used to thread follow-ups as replies), and `openedAt`/`openCount` (from the tracking pixel). Follow-ups are added and removed freely — there's no fixed count.
- `GoogleAuth` — singleton row (`id: "singleton"`) holding the connected Gmail account's OAuth tokens. Single-user tool, so one row is enough.

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
- `vercel.json` pins the serverless function region to `icn1` (Seoul), matching the Supabase database region (`ap-northeast-2`, also Seoul) — this is what keeps page navigation fast, since every page does a live query. Don't remove it without picking a replacement region close to wherever the database ends up.
- `loading.tsx` files under `src/app/`, `src/app/leads/`, and `src/app/leads/[id]/` show a skeleton instantly on navigation while the next page's data is still loading — keep these in sync if you restructure those routes.
- Any new page that only reads the database (no `cookies()`/`headers()`/`searchParams`) needs `export const dynamic = "force-dynamic"` — otherwise Next.js prerenders it once at build time and serves that frozen snapshot forever (bit both Dashboard and Analytics before this was added).
- Gmail integration: OAuth client lives in Google Cloud project `builtbyjawad-portal` (its own project — not shared with any other Google Workspace tool), scopes `gmail.send` + `gmail.readonly`, redirect URI `$APP_URL/api/google/callback`. Tokens are stored in the `GoogleAuth` table, refreshed automatically by `googleapis`.
- The tracking pixel (`/api/track/[id]`) needs `x-vercel-protection-bypass=$VERCEL_AUTOMATION_BYPASS_SECRET` appended to its URL, or Vercel's deployment protection silently blocks Gmail's image-proxy servers from ever reaching it (opens just never register, no error anywhere). The bypass secret is added under Project Settings → Deployment Protection → Protection Bypass for Automation and auto-injected as an env var — see `src/lib/actions.ts` (`sendEmailNow`).
