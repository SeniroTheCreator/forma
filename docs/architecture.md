# Architecture

This document describes what was actually built: the request-handling layering,
the real `src/` folder structure, and why the cross-cutting `lib/` modules are
split the way they are. Where the implementation diverged from the original
design spec (`docs/superpowers/specs/2026-07-27-foundation-design.md`), this
document describes the as-built behavior and calls out the divergence
explicitly.

## Layering

Every mutation or authorization-sensitive read follows the same three-layer
path:

```
Server Action / Route Handler  →  service (lib/services)  →  db layer (lib/db)
        │                                │
   zod-validate input              enforce permissions
   rate limit (auth flows)         (lib/permissions / RLS)
   map errors → client shape       talk to Supabase
```

1. **Server Actions** (`"use server"` functions in `src/app/**/actions.ts`) and
   **Route Handlers** (`src/app/api/**/route.ts`) are kept thin: parse and
   validate `FormData`/JSON with a zod schema, resolve the caller's identity
   (`supabase.auth.getUser()`), call exactly one service function, and map any
   thrown error to a response via `mapErrorToResponse` (`lib/errors/AppError.ts`).
   Auth-flow actions (`signupAction`, `loginAction`, `resendVerificationAction`,
   `forgotPasswordAction`) additionally call `enforceRateLimit` before touching
   Supabase.
2. **Services** (`src/lib/services/*.ts`) hold the actual business logic:
   permission checks (`requirePermission`, backed by the `has_permission`
   Postgres function), cross-record orchestration, and enforcing "who can act on
   whose data" rules that aren't expressible as a single RLS policy (e.g.
   `userService.getProfile`/`updateProfile` reject `callerId !== targetId`
   outright, before ever issuing a query). Services receive an
   already-authenticated `SupabaseClient` from the caller — they never construct
   their own client from a session.
3. **The db layer** (`src/lib/db/*.ts`) is a thin, typed repository per table
   (`getUserById`/`updateUser`, `insertFileRecord`/`deleteFileRecord`,
   `listNotificationsForUser`/`markNotificationRead`/`insertNotification`,
   `insertAuditLog`). No business logic lives here — just a typed
   `supabase.from(...)` call and error propagation. Types come from
   `src/lib/supabase/database.types.ts` (generated via
   `supabase gen types typescript`), so every query is checked against the real
   schema.

**RLS is defense-in-depth, not the only gate.** The app-level permission check
in the service layer (`requirePermission`) is what actually produces a
`ForbiddenError` with a clean message for the UI. Postgres RLS policies (see
`docs/database.md`) independently re-enforce the same boundary at the database
level, so a bug in a service's permission check — or a future caller that
skips the service layer entirely and queries Supabase directly — still can't
read or write rows it shouldn't. The `protect_account_status` trigger (below)
is the sharpest example: even the `users` table's own row-owner UPDATE policy
can't stop a user from editing `account_status` on their own row, so that one
column is independently locked down by a trigger, matching the specific
`users:suspend` permission the service layer requires.

## Folder structure (as built)

```
src/
  app/
    (marketing)/            # landing page — layout.tsx, page.tsx
    (auth)/                 # signup, login, verify-email, forgot/reset-password
                             #   + actions.ts (Server Actions: signup/login/logout/
                             #     resend-verification/forgot/reset/change-password)
    (dashboard)/             # protected: dashboard, settings, notifications
                             #   + actions.ts (profile update, avatar upload)
    (admin)/                 # protected: /admin/users, /admin/users/[id]
    api/
      admin/users/           # GET list, GET/PATCH one user (role/status changes)
      notifications/         # GET list, POST [id]/read
    layout.tsx, globals.css  # RootLayout (Redux provider), global styles
  components/
    ui/                      # shadcn primitives (button, card, input, label)
    layout/                  # Header, Footer, DashboardShell
    features/                # auth forms, admin table/detail panel, dashboard
                              #   profile form, avatar upload, notification bell,
                              #   toast viewport
  lib/
    supabase/                # browser/server/admin client factories + generated
                              #   database.types.ts
    db/                      # typed per-table repository functions
    services/                # authService, userService, fileService,
                              #   notificationService, adminService
    validation/               # zod schemas (authSchemas, userSchemas)
    permissions/               # hasPermission/requirePermission — RBAC gate
    errors/                     # AppError hierarchy + mapErrorToResponse
    logger/                      # pino instance + redaction config
    config/                       # env.ts (server) + publicEnv.ts (client) — see below
    rateLimit/                    # Upstash-backed limiter (fail-open)
    security/                     # CSP + other security headers (wired into next.config.ts)
    utils.ts                      # cn() class-merge helper (shadcn convention)
  store/                    # Redux Toolkit store, uiSlice (toasts), RTK Query
                             #   API slices (adminApi, notificationsApi), StoreProvider
  proxy.ts                  # route protection — see divergence #1 below
supabase/
  migrations/               # schema as SQL, 0001–0005 (see docs/database.md)
  seed.sql                  # seeds a real auth.users admin account for e2e
tests/
  integration/               # Vitest, against a real local Supabase instance
  e2e/                        # Playwright
  mocks/                      # next/headers stub for integration tests
docs/
  architecture.md, database.md  # this file and its sibling
  superpowers/specs/            # original design spec
```

There is no `lib/email` module. The design spec proposed one, but no
application code sends email directly — verification, password-reset, etc.
emails are entirely owned by Supabase Auth, which is configured (via
`supabase/config.toml`'s `[auth.email.smtp]`, currently commented out/using
Supabase's local test inbox in dev) to relay through Resend in a real
deployment. `RESEND_API_KEY` is validated as a required env var (so a deploy
fails fast if it's missing) but is not imported or called from `src/` — it's
consumed by Supabase Auth's own SMTP config, not the app.

## Cross-cutting `lib/` modules

Each of the following exists as its own module instead of being folded into
services, specifically so it can be swapped, tested, or reasoned about in
isolation:

- **`lib/errors`** — `AppError` and its subclasses (`ValidationError`,
  `AuthError`, `ForbiddenError`, `NotFoundError`, `RateLimitError`), each
  carrying a fixed `statusCode`/`code`, plus a single `mapErrorToResponse()`.
  Every Server Action/Route Handler boundary calls this same function, so
  callers get one consistent `{ error, code }` shape regardless of which layer
  threw, and internal error details/stack traces never leak into a response.
- **`lib/logger`** — a single shared `pino` instance, configured once
  (`LOG_LEVEL` from env, redaction of `password`/`token`/`authorization` fields).
  Centralizing this means every call site (`logger.warn({ err }, ...)`) gets
  the same redaction and formatting for free, and log verbosity is a single
  env var rather than scattered `console.log`s.
- **`lib/permissions`** — `hasPermission`/`requirePermission`, the single
  place application code asks "can this user do X?". It wraps one RPC call to
  the `has_permission` Postgres function (also reused directly inside RLS
  policies and the `protect_account_status` trigger — see `docs/database.md`),
  so the app-level and DB-level checks are guaranteed to use identical logic,
  not two independently-maintained rule sets.
- **`lib/rateLimit`** — `enforceRateLimit(key)`, a thin wrapper around
  `@upstash/ratelimit`'s sliding-window limiter. Isolated so the
  fail-open-on-infra-error behavior (catch, log a warning, allow the request)
  lives in exactly one place: this project ships with placeholder Upstash
  credentials by default, and every Server Action that calls
  `enforceRateLimit` needs that failure mode to be "don't block auth in dev,"
  not "every login attempt throws because Upstash isn't configured yet."
- **`lib/config`** — see the env split below; isolated because env parsing
  needs to happen exactly once, fail fast (`zod .parse`, not `.safeParse`) at
  import time, and be typed everywhere else that reads `process.env`.

## Divergences from the original design spec

The design spec (`docs/superpowers/specs/2026-07-27-foundation-design.md`)
was written before implementation and doesn't reflect a few decisions made
while building against the real Supabase/Next.js APIs:

1. **Route protection lives in `src/proxy.ts`, not `src/middleware.ts`.**
   Next.js 16 (this project pins `next@16.2.12`) deprecated the
   `middleware.ts` convention in favor of `proxy.ts`; both still work today,
   but `proxy.ts` is the forward-looking convention and is what this project
   uses. Its behavior matches the spec's description: it checks the Supabase
   session for `/dashboard`, `/settings`, `/notifications`, and `/admin`
   (redirecting unauthenticated requests to `/login`), and additionally checks
   the `admin:access` permission via the `has_permission` RPC for `/admin`
   (redirecting authenticated-but-unauthorized requests to `/dashboard`).
2. **Env config is split into two files**, not the single `lib/config` module
   the spec sketched:
   - `src/lib/config/publicEnv.ts` — no `server-only` import, validates only
     the three `NEXT_PUBLIC_*` vars, safe to import from Client Components.
   - `src/lib/config/env.ts` — starts with `import "server-only"`, validates
     every var including secrets (`SUPABASE_SERVICE_ROLE_KEY`,
     `RESEND_API_KEY`, `UPSTASH_REDIS_REST_*`), and re-exports `publicEnv` for
     convenience in server code.

   This split exists because `server-only` guards an entire module: if
   `publicEnv` were exported from the same file as the secret-holding `env`,
   *any* Client Component importing `publicEnv` (e.g. to construct a browser
   Supabase client) would crash the build, since the whole file — secrets and
   all — would be marked server-only. Splitting the file is what makes the
   client-safe subset actually usable from the client.
3. **`insertAuditLog`/`notifyUser` always run through a service-role admin
   client**, obtained via `createAdminSupabaseClient()`
   (`src/lib/supabase/admin.ts`) — but only *after* the caller's own
   permission check and the actual data mutation (role change / status change)
   have already succeeded using the caller's regular session-scoped client.
   See `adminService.changeUserRole`/`setAccountStatus` in
   `src/lib/services/adminService.ts`. This is deliberate, not a shortcut:
   `authenticated` has no INSERT grant on `audit_log` or `notifications` (see
   `docs/database.md`) — those two tables are insert-only via the
   service-role key, by design, so the write path is never directly reachable
   through a user's own session, even if application code had a bug. The
   permission check and the actual mutation being audited must still run on
   the caller's own client, or the audit/notification would be recording an
   action that was never actually gated by RLS.
4. **`user_roles` has RLS-gated INSERT/DELETE for `authenticated`**
   (migration `0004_user_roles_write_access.sql`), keyed on
   `has_permission(auth.uid(), 'users:write')`. The original schema
   (`0001_core_schema.sql`) only granted `authenticated` SELECT on this table;
   the admin panel's role-reassignment feature (`adminService.changeUserRole`)
   needed to delete-then-insert a `user_roles` row using the caller's own
   session so RLS genuinely gates the action, so migration `0004` added the
   missing grant + matching INSERT/DELETE policies.
5. **The `protect_account_status` trigger checks `users:suspend`, not
   `users:write`** (fixed in migration `0005_fix_account_status_permission.sql`).
   The original trigger (in `0001`) checked `users:write`, but the
   application-level guard `adminService.setAccountStatus` actually enforces
   is the more specific `users:suspend` permission. With the seed data's
   two-role setup this was masked (the `admin` role has both permissions), but
   it meant the DB-level trigger wasn't real independent defense-in-depth for
   the `users:suspend` boundary — a hypothetical future role with
   `users:write` but not `users:suspend` could have flipped `account_status`
   directly via the Data API despite failing the app-level check. Migration
   `0005` replaces the trigger function so the DB-level guard matches the
   permission the app actually requires.
6. **Every table's initial migration needed explicit `GRANT` statements**, not
   just RLS policies. RLS only filters *which rows* a query already permitted
   to run can see/touch — without a `GRANT` on the table to `anon`/
   `authenticated`/`service_role`, PostgREST's Data API can't reach the table
   at all, and (per Postgres's own semantics) `service_role`'s `BYPASSRLS`
   attribute does not remove the need for the underlying `GRANT` either. This
   was learned the hard way while building the schema (see the comments in
   `supabase/migrations/0001_core_schema.sql` and
   `0002_files_notifications_audit.sql`): a first attempt at the schema had
   RLS policies but no grants, and every table was unreachable via the real
   Data API despite the policies being correct. **Pattern for adding new
   tables**: always pair `alter table ... enable row level security` +
   `create policy ...` with an explicit `grant select/insert/update/delete on
   <table> to <role>` for every role that should be able to reach the table at
   all — grants are the base-level access control, RLS is the row-level filter
   on top of it, and both are required.
7. **Rate limiting fails open**, not closed: `enforceRateLimit` catches any
   error from the Upstash call, logs a warning, and lets the request through
   (`src/lib/rateLimit/index.ts`). This project ships with placeholder Upstash
   credentials in `.env.example`, and a fail-closed limiter would mean every
   signup/login/forgot-password attempt is blocked by default until a real
   Upstash instance is wired up — the deliberate tradeoff here is availability
   over strict rate-limit enforcement when the rate limiter's own
   infrastructure is unreachable.

## Migrations

There are 5 migrations, applied in order by `pnpm supabase db reset`:

| # | File | Adds |
|---|------|------|
| 1 | `0001_core_schema.sql` | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`; `has_permission()`; `handle_new_user()` trigger; `protect_account_status()` trigger; RLS + grants |
| 2 | `0002_files_notifications_audit.sql` | `files`, `notifications`, `audit_log`; RLS + grants |
| 3 | `0003_avatars_bucket.sql` | `avatars` Storage bucket + owner-upload policy |
| 4 | `0004_user_roles_write_access.sql` | INSERT/DELETE grant + RLS policies on `user_roles` for `authenticated` |
| 5 | `0005_fix_account_status_permission.sql` | Fixes `protect_account_status()` to check `users:suspend` instead of `users:write` |

Full column/policy detail is in `docs/database.md`.
