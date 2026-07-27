# Foundation Design — Reusable Full-Stack Starting Point

Date: 2026-07-27
Status: Approved for implementation planning

## 1. Goal & Scope

Build a production-ready, content-agnostic full-stack foundation: authentication, user management, RBAC, a landing page, an authenticated dashboard, and an admin panel — structured so a specific product can be layered on later without reworking auth/permissions/data plumbing.

Explicitly out of scope for this build (left room for, not built now): payments/subscriptions, blogs, messaging/forums, AI features, teams/organizations, public APIs, plugin system.

This spec replaces an earlier, abandoned marketplace-specific plan (see memory `project_platform_decisions` / `project_phase1_status` — superseded 2026-07-27).

## 2. Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres, Auth, Storage
- shadcn/ui (Radix + Tailwind) for the component library
- Resend for transactional/application email; Supabase Auth SMTP configured to relay through Resend so verification/reset emails use Resend delivery with custom templates while Supabase Auth still owns token issuance/verification
- Redux Toolkit (+ RTK Query) for all client-side state and data fetching that isn't a direct form Server Action
- react-hook-form + zod for form state/validation
- pino for structured logging
- Upstash Redis + `@upstash/ratelimit` for rate limiting
- Vitest (unit/integration) + Playwright (e2e)
- pnpm, single Next.js app at repo root, deployed to Vercel
- Supabase CLI migrations (SQL files in `supabase/migrations`) — no separate ORM; typed access via `supabase gen types typescript` so RLS keeps enforcing through the normal client

## 3. Folder Structure

```
src/
  app/
    (marketing)/            # landing page — swappable later
    (auth)/                 # signup, login, verify-email, forgot/reset-password
    (dashboard)/            # protected: dashboard, settings, notifications
    (admin)/                # protected: /admin/users
    api/                    # route handlers for anything external callers need (webhooks, future public API)
  components/
    ui/                     # shadcn primitives
    layout/                 # Header, Footer, DashboardShell, AdminShell
    features/                # feature-specific components (auth forms, admin table, etc.)
  lib/
    supabase/                # browser + server Supabase client factories
    db/                       # typed repository functions per table
    services/                 # business logic: authService, userService, fileService, notificationService, adminService
    validation/                # zod schemas per resource
    permissions/                # canDoX(userId, action, resource) — single RBAC gate
    email/                       # Resend client + templates for app-triggered emails
    errors/                       # AppError classes + response mapping
    logger/                        # pino instance + redaction config
    config/                         # zod-validated typed env access
    rateLimit/                       # Upstash-backed limiter helpers
  store/                    # Redux Toolkit store, slices (auth, ui, notifications), RTK Query API slices
  middleware.ts             # session check + role gating for (dashboard)/(admin)
supabase/
  migrations/                # schema as SQL
docs/superpowers/specs/      # design specs (this file)
```

Route handlers/Server Actions stay thin: parse+validate input (zod) → call a service → service enforces permissions and talks to the db layer. This is the seam that isolates "what this product does" from auth/permissions/db plumbing.

## 4. Data Model (Supabase/Postgres)

- `public.users` — id (= auth.users.id), first_name, last_name, email, account_status (`active`|`suspended`), created_at, updated_at, last_login_at. Populated by a trigger on `auth.users` insert (reads `raw_user_meta_data` for names). Password hash and email-verification state live in `auth.users` (Supabase Auth owns them) — never duplicated here.
- `roles` — id, name, description. Seeded with `user`, `admin`.
- `permissions` — id, key (e.g. `users:read`, `users:write`, `users:suspend`, `admin:access`), description.
- `role_permissions` — role_id, permission_id.
- `user_roles` — user_id, role_id. New signups get `user`; `admin` assigned manually (matches original goal's instruction not to build an ownership bootstrap flow).
- `files` — id, owner_id, bucket, path, filename, mime_type, size_bytes, created_at. Generic; first real consumer is avatar upload.
- `notifications` — id, recipient_id, type, title, message, read_at (nullable), created_at. Inserted only by services (service-role key), never directly by clients.
- `audit_log` — id, actor_id, action, target_type, target_id, metadata (jsonb), created_at. Written by admin actions (role change, suspend/reactivate) — a security/accountability expectation once an admin panel can mutate other users.

RLS is enabled on every table from the first migration:
- `users`: row owner can select/update own row; permission check (`users:read`/`users:write`) allows admin access to any row.
- `roles`/`permissions`/`role_permissions`: readable by authenticated users, writable only by service role.
- `files`: owner-only CRUD via `owner_id = auth.uid()`; admin read via permission check.
- `notifications`: recipient can select and mark-read own rows; insert restricted to service role.
- `audit_log`: admin-only read; insert restricted to service role.

## 5. Auth & Authorization Flow

- **Signup**: Server Action → `supabase.auth.signUp` with `{ first_name, last_name }` metadata and password-confirmation validated client+server side via zod → DB trigger creates `public.users` row + default `user` role → Supabase sends the verification email through the Resend SMTP relay.
- **Resend verification email**: Server Action wrapping `supabase.auth.resend({ type: 'signup' })`, rate-limited.
- **Login**: Server Action → `supabase.auth.signInWithPassword` → on success, update `last_login_at` → session cookie set via `@supabase/ssr`.
- **Logout**: Server Action → `supabase.auth.signOut`.
- **Forgot/reset password**: `supabase.auth.resetPasswordForEmail` (Resend-relayed email) → reset page uses the recovery token to call `updateUser({ password })`.
- **Change password** (authenticated): Server Action → `updateUser({ password })`, requires current-session validation.
- **Protected routes**: `middleware.ts` checks the Supabase session for the `(dashboard)` and `(admin)` route groups; `(admin)` additionally checks `admin:access` permission via the `lib/permissions` gate before allowing the request through.

## 6. Security

- Passwords: hashed entirely by Supabase Auth; the app never sees or stores a hash.
- Input validation: every Server Action/Route Handler parses input through a zod schema before touching a service.
- SQL injection: mitigated structurally — all data access goes through the Supabase client (parameterized), no raw SQL string concatenation anywhere in app code.
- XSS: React's default escaping, no `dangerouslySetInnerHTML`, CSP header set via `next.config`.
- CSRF: Server Actions are same-origin/POST-only by Next.js default; Supabase session cookies set `SameSite=Lax`, `httpOnly`, `secure`.
- Rate limiting: Upstash-backed limiter wraps signup, login, resend-verification, and forgot-password actions, keyed by IP + action.
- Security headers: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` set in `next.config`.
- Config: `lib/config` validates all required env vars at boot with zod and fails fast if any are missing/malformed.

## 7. Error Handling & Logging

- `lib/errors`: `AppError` base class + `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `RateLimitError`, each with a status code; a single `mapErrorToResponse()` used at every Server Action/Route Handler boundary so clients get a consistent shape and internals never leak.
- `lib/logger`: pino, structured JSON, redacts `password`/`token`/`authorization` fields, level driven by `LOG_LEVEL` env var.

## 8. Frontend

- **Layouts**: `RootLayout` (Redux provider, theme), `MarketingLayout`, `AuthLayout` (centered card), `DashboardLayout` (sidebar+header shell), `AdminLayout` (extends dashboard shell with admin nav).
- **State**: Redux Toolkit store with `authSlice` (current user/session, hydrated on load), `uiSlice` (toast queue, modal state, sidebar collapse), `notificationsSlice`. RTK Query API slices handle client-side fetch/mutate for anything not a direct form submission (admin user table pagination/search, notification center). Server Actions remain the source of truth for form submissions.
- **Component library** (shadcn/ui-based): Button, Input, Textarea, Select, Checkbox, Form (react-hook-form + zod resolver wrapper), Card, Dialog/Modal, Dropdown Menu, Avatar, Toast, Spinner, ErrorState/EmptyState, DataTable (powers the admin user list).
- **Landing page**: Hero, Features (generic placeholder cards), CTA, header Login/Signup links, Footer — isolated in the `(marketing)` route group so it's a clean swap later.
- **Dashboard**: welcome + user-info card, Settings (profile edit, change password, avatar upload via the file module), notification center, Logout.
- **Admin panel** (`/admin/users`): searchable/paginated DataTable of users → detail view → change role, toggle `active`/`suspended`. Each mutation writes an `audit_log` row and creates a notification for the affected user.

## 9. Testing Strategy (TDD during implementation)

- **Unit** (Vitest): validation schemas, `lib/permissions` checks, services with a mocked db layer.
- **Integration** (Vitest against a local Supabase instance via Supabase CLI/Docker): auth flows end-to-end at the service layer, RLS policy checks (verify a user genuinely cannot read another user's row, etc.).
- **E2E** (Playwright): signup → verify → login → dashboard journey; admin role-change/suspend journey.

## 10. Environment Variables

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
RESEND_API_KEY=your_resend_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
LOG_LEVEL=info
```

No real credentials are used anywhere in this build; all values above are placeholders for the user to fill in later.

## 11. Deferred / Future Extensibility

Not built now, but the architecture doesn't block adding them later: payments/subscriptions, blogs, messaging/forums, AI features, teams/organizations, public APIs, a plugin system. The service-oriented `lib/services` layer, the generic `files`/`notifications` tables, and the RBAC permission model are the seams intended to absorb these without a rework.
