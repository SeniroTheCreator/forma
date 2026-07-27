# Forma — Full-Stack Foundation

A reusable, production-grade full-stack starting point: authentication, RBAC-based
user management, an admin panel, file storage, and in-app notifications, built on
Next.js (App Router) + Supabase.

**This is a foundation, not a finished product.** There is no specific business
domain layered on top — no billing, no content model, no product-specific pages.
The intent is that a real product gets built *on top of* the auth/permissions/data
plumbing here, without having to rework it. See [`docs/architecture.md`](docs/architecture.md)
for the layering this is designed around, and [`docs/database.md`](docs/database.md)
for the schema.

## Features

**Authentication**
- Signup with first/last name, email, password + confirmation
- Login / logout with secure, cookie-based sessions (`@supabase/ssr`)
- Email verification on signup, with a resend-verification flow
- Forgot password → email reset link → set new password
- Change password (re-authenticates with the current password first)
- Every auth action is rate-limited via Upstash Redis (fails *open*, not
  closed, if the rate limiter's backing store is unreachable, so a misconfigured
  or down rate limiter never blocks legitimate signups/logins)

**Authorization (RBAC)**
- Database-backed roles and permissions (`roles`, `permissions`,
  `role_permissions`, `user_roles` — not a hardcoded enum), with a single
  `has_permission(user, permission)` function used consistently by application
  code, Postgres Row-Level Security policies, and database triggers
- Enforced at two independent layers: the service layer rejects unauthorized
  calls with a clean error *before* touching the database, and Postgres RLS
  independently re-enforces the same boundary — a bug in one layer can't be
  exploited past the other

**User dashboard**
- Profile editing (first/last name)
- Avatar upload to Supabase Storage, with server-side file-size and MIME-type
  validation (rejected both at the app layer and at the storage-bucket level)
- In-app notification center (bell icon with unread count, mark-as-read)

**Admin panel**
- Searchable, paginated user list
- Change a user's role; suspend or reactivate an account — both take effect
  immediately (a suspended user is signed out and blocked from logging back in)
- Every admin action writes an audit-log entry and notifies the affected user
- Admins cannot demote or suspend their own account (no accidental lockout)

**Security**
- Password hashing, SQL-injection protection, and email-verified sessions all
  handled by Supabase Auth
- All input validated with `zod` before it reaches any service
- Security headers (CSP, `X-Frame-Options`, `Strict-Transport-Security`, etc.)
- Structured logging (`pino`) with automatic redaction of secrets
- Centralized, typed error handling (`AppError` → consistent client responses)

**Landing page** — a responsive marketing page (hero, features, CTA) as a
placeholder, meant to be replaced once you know what you're building.

**Testing** — 119 unit/integration tests (Vitest) plus a Playwright end-to-end
suite covering signup → login → dashboard, avatar upload persistence, and the
full admin role-change/suspend journey. See [Testing](#testing) below.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage) — local dev via the Supabase CLI + Docker
- Redux Toolkit + RTK Query for client state / non-form data fetching
- react-hook-form + zod for form state/validation
- pino for structured logging
- Upstash Redis + `@upstash/ratelimit` for rate limiting
- Resend (env-configured; wired through Supabase Auth's SMTP relay, not called
  directly from application code — see [`docs/architecture.md`](docs/architecture.md))
- Vitest (unit/integration) + Playwright (e2e)
- pnpm

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [pnpm](https://pnpm.io/) (this repo uses pnpm exclusively — do not use npm/yarn)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — required to run
  Supabase locally via the Supabase CLI

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`. For local development, `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` come from `pnpm supabase start`'s output (see
below); `RESEND_API_KEY` and the `UPSTASH_REDIS_REST_*` values can stay as
placeholders in development — email sending isn't invoked from application code,
and rate limiting fails open (allows the request, logs a warning) if Upstash is
unreachable, so neither blocks local dev.

Start local Supabase (Postgres + Auth + Storage + Studio, via Docker) and apply
the migrations + seed data:

```bash
pnpm supabase start
pnpm supabase db reset
```

`pnpm supabase start` prints a local API URL and anon key — copy those into
`.env.local` if you haven't already. `pnpm supabase db reset` (re)applies every
migration in `supabase/migrations/` in order and then runs `supabase/seed.sql`,
which creates a real, confirmed `admin@example.com` / `admin-password-1` account
with the `admin` role. This account is what the e2e admin-journey test signs in
as, so re-run `db reset` any time you want a clean database or before running
`pnpm test:e2e`.

Run the dev server:

```bash
pnpm dev
```

The app runs at http://localhost:3000. Local Supabase Studio (a GUI for the
database) runs at http://localhost:54323.

## Testing

Unit and integration tests (Vitest):

```bash
pnpm test        # runs once
pnpm test:watch  # watch mode
```

This runs two Vitest projects:

- **`unit`** — colocated `src/**/*.test.ts(x)` files: validation schemas,
  permissions, services with a mocked db layer, config parsing, Redux slices,
  components. No external dependencies; runs anywhere.
- **`integration`** — `tests/integration/**`: exercises Server Actions and
  `src/proxy.ts` route protection against a **real local Supabase instance**,
  with nothing mocked except Next's request-context plumbing. `pnpm supabase
  start` must already be running.

The integration project needs a running app for the `src/proxy.ts` tests (proxy
code only runs inside a real Next.js request), so it boots `pnpm dev` itself via
a Vitest `globalSetup` (`tests/setup/devServer.ts`) and shuts it down when the
run finishes. If something is already serving http://localhost:3000, that server
is reused and left running instead. So `pnpm test` is self-contained: with only
`pnpm supabase start` running, `pnpm test` from a clean checkout is green.

Integration tests create real Supabase Auth users and delete them again when the
suite finishes; a completed run leaves the database exactly as it found it.

End-to-end tests (Playwright):

```bash
pnpm supabase db reset   # re-seed a clean DB, including the admin test account
pnpm test:e2e
```

Playwright boots the Next.js dev server itself (see `playwright.config.ts`) and
drives real browser flows against local Supabase, so `pnpm supabase start` must
be running first. The suite covers:

- signup → login → dashboard, and redirect-to-login for protected/admin routes
  while unauthenticated;
- uploading an avatar on `/settings` and confirming it is still rendered after
  a page reload;
- signed in as the seeded admin: viewing and searching the users table;
  changing another user's role and suspending them through the UI (both
  asserted to survive a reload); and confirming an admin cannot demote or
  suspend *their own* account.

## Project layout

See [`docs/architecture.md`](docs/architecture.md) for the full folder structure,
the request-handling layering (Server Action/Route Handler → service → db layer),
and why each cross-cutting `lib/` module exists separately.

See [`docs/database.md`](docs/database.md) for every table, its RLS policies, and
the triggers that provision a new user's `public.users`/`user_roles` rows on
signup.

## Deployment

This is a Next.js + Supabase app — it needs a real Node server (Server Actions,
API routes) and a live Postgres database, so it can't run on static hosting like
GitHub Pages. The free, standard way to run it 24/7:

1. **Create a Supabase Cloud project** at [supabase.com](https://supabase.com)
   (free tier). This becomes your *production* database, separate from the
   local Docker one used in development.
2. **Push the schema**: `pnpm supabase link --project-ref <your-project-ref>`,
   then `pnpm supabase db push` to apply every migration in
   `supabase/migrations/` to the cloud project. Run `supabase/seed.sql`'s
   admin-account creation manually (or via the Supabase SQL editor) if you want
   a seeded admin in production — don't rely on the local dev seed script as-is
   for a real deployment, since it uses a known test password.
3. **Deploy to [Vercel](https://vercel.com)** (free tier, built by the Next.js
   team): import this GitHub repo, and it auto-detects the Next.js app.
4. **Set environment variables** in the Vercel project settings, using your
   Supabase Cloud project's values (Project Settings → API in the Supabase
   dashboard) in place of the local placeholders in `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL). Add
   real `RESEND_API_KEY`/`UPSTASH_REDIS_REST_*` values if/when you want email
   sending and rate limiting to be fully live in production — the app runs
   without them (email isn't called from app code today; rate limiting fails
   open), but production traffic should have real rate limiting.
5. Every push to `main` auto-deploys via Vercel's GitHub integration.

## Running it locally without a terminal

`run-locally.bat` (Windows) starts Docker's Supabase stack if it isn't already
running, starts the dev server, and opens the app in your browser. Double-click
it, or run it from a terminal. Close its window to stop the dev server (Docker/
Supabase keeps running in the background — run `pnpm supabase stop` to stop
that too).

## Other scripts

```bash
pnpm build   # production build
pnpm start   # run a production build
pnpm lint    # eslint
```
