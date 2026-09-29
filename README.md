# Gatherly — community event platform

One platform for community events and hackathons: participants **register → check in via QR → join teams → submit projects → judges score → audience votes → certificates are issued**.

Built with Next.js 15 (App Router), Clerk, and Supabase Postgres.

## Features

- **Event management** — create events with description, date, venue, capacity, announcements, and a public page (`/e/[slug]`). Draft → publish → complete lifecycle.
- **Clerk auth** — Google/GitHub sign-in, participant profiles, organizer/judge/volunteer roles.
- **QR check-in** — every registration gets a QR ticket (`/e/[slug]/my-ticket`); staff scan it at `/checkin/[eventId]` to mark attendance.
- **Team formation** — teams post what they're looking for ("frontend developer", "AI engineer", "designer"); registered attendees request to join; team leads accept/decline.
- **Project submission** — name, description, GitHub, live demo, video, technologies.
- **Live judging** — judges score Innovation / UX / Technical / Impact (0–10 each) at `/e/[slug]/judge`.
- **Audience voting** — organizers project a voting QR; attendees scan, authenticate, and vote once (enforced by a DB primary key; revoting switches the pick).
- **Certificates** — organizer issues participation / winner / runner-up / volunteer / speaker / judge certificates in one click. Each has a unique code, a public verify page (`/verify/[code]`), and a generated PDF with a verification QR.
- **Community profiles** — `/u/[clerkId]` shows headline, skills, events attended, projects submitted, and hackathon wins — the seed of a developer community directory.

## Tech notes

- All database access happens in **server components and server actions** via a Supabase **secret key** (never shipped to the browser). RLS is enabled on every table with no public policies, so the Data API exposes nothing to anonymous or authenticated roles — authorization lives in `src/lib/actions/*` and `src/lib/auth.ts`.
- Vote uniqueness: `votes` primary key `(event_id, voter_id)`.
- Check-in idempotency: `checkins` primary key `(event_id, user_id)`; duplicate scans report "already checked in".

## Setup

### 1. Supabase

1. Create a project (or use an existing one).
2. Apply the schema: run `supabase/migrations/0001_init.sql` in the SQL editor, or `supabase db push` with the CLI.
3. Project Settings → API Keys → copy the **project URL** and create a **secret key** (`sb_secret_...`).

### 2. Clerk

1. Create an app at https://dashboard.clerk.com and enable **Google** and **GitHub** social providers.
2. Copy the publishable key (`pk_test_...`) and secret key (`sk_test_...`).

### 3. Environment

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
```

Optional:

- `ADMIN_CLERK_IDS` — comma-separated Clerk user IDs with platform-admin rights (can manage any event).
- `NEXT_PUBLIC_APP_URL` — absolute base URL used inside QR codes (defaults to the request host).

### 4. Run

```bash
npm install
npm run dev
```

## Walkthrough

1. Sign in, go to **Organize → New event**, publish it.
2. On the event page, register — then open **My QR ticket**.
3. As the organizer, open **Check-in desk** and scan the ticket (or paste the ticket code).
4. Attendees create/join teams on **Teams**, then **Submit project**.
5. Add judges under **Manage → Staff & judges**; judges score at the judge dashboard.
6. Project the **Voting QR**; attendees vote at `/e/[slug]/vote`.
7. Mark the event completed → **Issue certificates** → attendees find PDFs on their dashboard; anyone can verify at `/verify/[code]`.

## Schema

Tables: `profiles`, `events`, `announcements`, `registrations`, `checkins`, `teams`, `team_members`, `join_requests`, `projects`, `event_roles`, `scores`, `votes`, `certificates`. See `supabase/migrations/0001_init.sql`.
