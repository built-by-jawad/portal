# builtbyjawad — Outreach Portal

Next.js app for running cold outreach: leads, an initial email draft, and as many follow-ups as you want per lead, fully branded (navy/paper/green, Space Grotesk + Inter).

**Live:** https://portal-built-by-jawad.vercel.app (Vercel deployment protection is on — you need to be logged into the `built-by-jawad` Vercel team to open it).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Prisma 5 + Postgres (Supabase project `Portal`, `uoevfpnpnaspzgqceddm`)
- Tailwind CSS v4
- Gmail API (`googleapis`) via OAuth — Google Cloud project `builtbyjawad-portal`, its own project, separate from any other Google Workspace integration
- Vercel Blob (`@vercel/blob`) for email attachment storage — store `portal-attachments` (public access), linked to the Vercel project
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

- **Dashboard** (`/`) — lead counts, a queue of the next unsent email steps (pipeline-aware, see below), and email performance (sent/open rate/click rate, per-step breakdown, recent activity) — analytics lives on the dashboard, there's no separate `/analytics` page anymore.
- **Leads** (`/leads`) — full list, filterable by status.
- **Add Lead** (floating **+** button, bottom-right on every page, opens `/leads/new`) — business info (name, contact, email, phone, website, trade, full address) plus optional leak notes/internal notes, which Gmail account to send from (if more than one is connected), **and the full email sequence right there**: an Initial Email plus as many Follow-up tabs as you add via "+ Add follow-up" before you've even saved the lead, each with its own body, a send date/time/timezone, and an "Include a subject line" checkbox. Follow-ups also get a "Send as" choice (reply in the same thread vs. a separate new email) and a pipeline condition (see below). There's no inline "Add Lead" button anywhere else — the floating button is the only entry point, by design.
- **Lead detail** (`/leads/[id]`) — same tabbed email editor, add/remove follow-ups freely, plus a per-lead "Send from" account picker and a "Check for replies" button. If Gmail is connected and the lead has an email address, **"Send via Gmail"** actually sends it (in the same thread or as a separate email per that step's "Send as" setting), embeds an open-tracking pixel and click-tracking on every link, attaches any files uploaded via that email's "Attach files to this email" checkbox, and stamps `sentAt` + advances the lead's status to Contacted on the first send. "Mark as sent manually" is the fallback for anything sent outside the system. A scoped **Inbox** section shows only Gmail messages to/from that lead's own email address — never a general inbox.
- **Inbox** (`/inbox`) — the same lead-scoped inbox, aggregated across every lead with an email address, in one place. Still never shows anything outside the lead list.
- **Settings** (`/settings`) — connect any number of Gmail accounts, mark one as the default (used for leads with no account explicitly chosen), and disconnect any of them.

There is no templates page — every email is written directly on the lead, from scratch.

Timezone doesn't need to be picked by hand: leaving it on "Auto-detect from address" fills it in server-side from the lead's address (via a US state → timezone lookup in `src/lib/timezone.ts`) whenever a lead is created or a follow-up is added. It's a best-effort guess from free-text address, not a geocoding API — always fine to override manually if it's wrong or the address is ambiguous/non-US.

### Reply-based pipeline

Each follow-up (order > 0) has an "Only send if…" condition: **Always**, **lead replied to the previous email**, or **lead did NOT reply**. "Check for replies" on a lead's page scans the Gmail thread for each sent step and stamps `repliedAt` on it if the lead's address shows up in a message dated after `sentAt` — that's what conditions check against. Sending (manual or scheduled) refuses a step whose condition isn't met yet, and the Dashboard's "Next up to send" queue only lists steps that are actually eligible. Replies still have to be checked (via that button) before a gated follow-up becomes eligible — there's no automatic reply-polling.

### Scheduled sending

Setting a Send date/time on an email step (see "Send date"/"Send time"/"Timezone" on each tab) queues it for automatic sending — no manual click needed. A Vercel Cron job hits `/api/cron/send-scheduled` every 5 minutes (`vercel.json`), which finds every unsent step whose scheduled date/time has passed (converted from its own timezone via `src/lib/scheduling.ts`, so DST is handled correctly) and whose pipeline condition (see above) is currently satisfied, then sends each one through the same `performSend` function (`src/lib/sendEngine.ts`) the manual "Send via Gmail" button uses — so scheduled and manual sends behave identically (threading, attachments, tracking, everything). Leave both date and time blank to keep an email manual-only. The cron endpoint is protected by `CRON_SECRET`, which Vercel automatically sends as `Authorization: Bearer $CRON_SECRET` on every cron invocation.

## Data model (`prisma/schema.prisma`)

- `Lead` — one business being pursued: contact info, trade, full `address` (no separate city/state/source fields), status, leak notes, and `sendAccountId` (which connected `EmailAccount` its sequence sends from; null = use the default account).
- `EmailStepRecord` — one row per email in a lead's sequence, ordered by `order` (0 = Initial Email, 1+ = Follow-up N). Holds `hasSubject` (whether this email shows a subject line), `threadMode` (`THREAD` reply-in-place vs `SEPARATE` new email), `condition` (`ALWAYS` / `IF_REPLIED` / `IF_NOT_REPLIED`, see Pipeline above) alongside subject/body, the planned `scheduledDate`/`scheduledTime`/`scheduledTimezone`, `sentAt`/`repliedAt`, `gmailThreadId`/`gmailMessageId` (used to thread follow-ups as replies), `openedAt`/`openCount` (tracking pixel), and `clickCount`/`firstClickAt`/`lastClickAt` (aggregate link clicks, detail in `ClickEvent`). Follow-ups are added and removed freely — there's no fixed count.
- `Attachment` — a file attached to one `EmailStepRecord`, stored in Vercel Blob; `url`/`filename`/`size`/`contentType` only, the file itself lives in Blob storage.
- `ClickEvent` — one row per link click recorded via `/api/click/[id]`, for per-link detail beyond the aggregate counters on `EmailStepRecord`.
- `EmailAccount` — a connected Gmail account (replaces the old single-account `GoogleAuth` table): OAuth tokens, `isDefault`, `email` (unique). Multiple can be connected at once; each `Lead` picks one via `sendAccountId`.

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
- Any new page that only reads the database (no `cookies()`/`headers()`/`searchParams`) needs `export const dynamic = "force-dynamic"` — otherwise Next.js prerenders it once at build time and serves that frozen snapshot forever (bit both Dashboard and the old Analytics page before this was added).
- Gmail integration: OAuth client lives in Google Cloud project `builtbyjawad-portal` (its own project — not shared with any other Google Workspace tool), scopes `gmail.send` + `gmail.readonly`, redirect URI `$APP_URL/api/google/callback`. Tokens are stored per-account in the `EmailAccount` table, refreshed automatically by `googleapis`. Connecting a new account is just visiting `/api/google/connect` again while signed into a different Google account — each one becomes its own `EmailAccount` row.
- The tracking pixel (`/api/track/[id]`) and the click-tracking redirect (`/api/click/[id]`) both need `x-vercel-protection-bypass=$VERCEL_AUTOMATION_BYPASS_SECRET` appended to their URLs, or Vercel's deployment protection silently blocks Gmail's image-proxy/link-preview servers from ever reaching them (opens/clicks just never register, no error anywhere). The bypass secret is added under Project Settings → Deployment Protection → Protection Bypass for Automation and auto-injected as an env var — see `src/lib/actions.ts` (`sendEmailNow`).
- Attachments upload through `/api/upload` straight to Vercel Blob (`put(..., { access: "public" })`) and get fetched server-side and base64-inlined into the raw MIME message when sending — no size/count limit is enforced beyond Gmail's own ~25MB message cap and Vercel's request body limit.
- Link click tracking rewrites every `http(s)://` URL found in the plain-text body into a link through `/api/click/[id]?u=<original>` at send time (see `textToHtml` in `src/lib/google.ts`) — it only tracks links inside the email body itself, not the tracking pixel or any link a recipient forwards elsewhere.
