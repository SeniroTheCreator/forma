# Website — Full-Stack Foundation

A reusable, production-grade full-stack starting point: authentication, RBAC-based
user management, an admin panel, file storage, and in-app notifications, built on
Next.js (App Router) + Supabase.

**This is a foundation, not a finished product.** There is no specific business
domain layered on top — no billing, no content model, no product-specific pages.
The intent is that a real product gets built *on top of* the auth/permissions/data
plumbing here, without having to rework it. See [`docs/architecture.md`](docs/architecture.md)
for the layering this is designed around, and [`docs/database.md`](docs/database.md)
for the schema.

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

This runs two Vitest projects: `unit` (colocated `src/**/*.test.ts` files —
validation schemas, permissions, services with a mocked db layer, config
parsing, etc., no external dependencies) and `integration` (`tests/integration/**`
— exercises Server Actions and route protection against a **real local Supabase
instance**, so `pnpm supabase start` must already be running for the
integration project to pass).

End-to-end tests (Playwright):

```bash
pnpm supabase db reset   # re-seed a clean DB, including the admin test account
pnpm test:e2e
```

Playwright boots the Next.js dev server itself (see `playwright.config.ts`) and
drives real browser flows — signup/login/dashboard and an admin role-change/
suspend journey signed in as the seeded admin account — against local Supabase,
so `pnpm supabase start` must be running first.

## Project layout

See [`docs/architecture.md`](docs/architecture.md) for the full folder structure,
the request-handling layering (Server Action/Route Handler → service → db layer),
and why each cross-cutting `lib/` module exists separately.

See [`docs/database.md`](docs/database.md) for every table, its RLS policies, and
the triggers that provision a new user's `public.users`/`user_roles` rows on
signup.

## Other scripts

```bash
pnpm build   # production build
pnpm start   # run a production build
pnpm lint    # eslint
```
