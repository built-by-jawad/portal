# builtbyjawad — Outreach Portal

Local-only Next.js app for running cold outreach: leads, an initial email draft, and as many follow-ups as you want per lead, fully branded (navy/paper/green, Space Grotesk + Inter).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Prisma 5 + SQLite (`prisma/dev.db`, local file, not committed)
- Tailwind CSS v4

## Getting started

```bash
npm install
npm run db:migrate   # creates/updates prisma/dev.db from prisma/schema.prisma
npm run dev            # http://localhost:3000
```

## What's here

- **Dashboard** (`/`) — lead counts, emails sent this 7 days, and a queue of the next unsent email steps.
- **Leads** (`/leads`) — full list, filterable by status.
- **Add Lead** (`/leads/new`) — business info + "leak spotted" notes (for your own reference when writing outreach). On save, an empty Initial Email is created for the lead.
- **Lead detail** (`/leads/[id]`) — tabbed emails: Initial Email plus as many Follow-up 1, 2, 3... tabs as you add via "+ Add follow-up". Each is independently editable, with "Mark as sent" (stamps the time and, for the first email sent, advances the lead's status to Contacted) and "Remove" (on follow-ups only — the initial email can't be deleted, just edited).

There is no templates page — every email is written directly on the lead, from scratch.

## Data model (`prisma/schema.prisma`)

- `Lead` — one business being pursued (contact info, trade, status, leak notes).
- `EmailStepRecord` — one row per email in a lead's sequence, ordered by `order` (0 = Initial Email, 1+ = Follow-up N), holding the drafted subject/body and `sentAt`. Follow-ups are added and removed freely — there's no fixed count.

SQLite has no native enum support in Prisma, so `status` and `trade` are plain strings validated against the lists in `src/lib/constants.ts`.

## Notes

- This sends nothing itself — it's a drafting/tracking tool. Copy the subject/body into whatever you actually send from (Gmail, etc.) and click "Mark as sent" here.
- `prisma/dev.db` is local and gitignored on purpose — if this ever gets deployed for real, swap SQLite for Postgres and point `DATABASE_URL` at it.
