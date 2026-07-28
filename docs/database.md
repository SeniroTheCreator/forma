# Database

Postgres schema, managed entirely as SQL migrations in `supabase/migrations/`
(no ORM) and applied in order by `pnpm supabase db reset`. Types for the app
are generated from this schema via `supabase gen types typescript` into
`src/lib/supabase/database.types.ts`, so every `lib/db` query is checked
against the real schema at compile time.

All tables below live in the `public` schema. `auth.users`/`auth.identities`
(Supabase Auth's own tables, not migrated by this repo) hold credentials and
email-verification state — this schema never duplicates a password hash.

## Access control pattern: grants + RLS

Every table combines two layers of access control, and **both are required**:

- **`GRANT`** — the base-level gate. Without an explicit `GRANT ... TO
  <role>`, PostgREST's Data API cannot reach a table at all, regardless of any
  RLS policy on it (this holds even for `service_role`, whose `BYPASSRLS`
  attribute skips RLS but not the grant requirement). Roles used: `anon`
  (unauthenticated), `authenticated` (any logged-in user), `service_role`
  (the server-only, RLS-bypassing key used by `createAdminSupabaseClient()`).
- **RLS policies** — the row-level filter on top: *given* a role can reach the
  table at all, which specific rows can it see/touch.

This project's first schema migration originally shipped RLS policies with no
grants and every table was unreachable via the Data API — see the comments in
`0001_core_schema.sql`/`0002_files_notifications_audit.sql`. Follow the
grant+policy pairing below as the pattern for any new table.

## Tables

### `public.users` (migration `0001`)

Mirrors/extends `auth.users` with app-facing profile fields. One row per
account, `id` shared with `auth.users.id`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, `references auth.users(id) on delete cascade` |
| `first_name` | `text` | not null |
| `last_name` | `text` | not null |
| `email` | `text` | not null |
| `account_status` | `text` | not null, default `'active'`, check in (`'active'`, `'suspended'`) |
| `avatar_url` | `text` | nullable (migration `0007`), public Storage URL of the user's current avatar |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |
| `last_login_at` | `timestamptz` | nullable, set by `loginAction` on successful login **via the service-role client** — see the column grant below |

- Grants: `authenticated` → `select` on all columns, and **`update` on only
  `first_name`, `last_name`, `avatar_url`, `account_status`** (migration
  `0007`); `service_role` → `select, insert, update, delete`.
  - `0001` originally granted `authenticated` a blanket table-level `update`,
    which combined with the "update own row" RLS policy let any logged-in user
    PATCH their own `email`, `created_at`, `updated_at` or `last_login_at`
    through the Data API. Column-level privileges are the right tool: an
    UPDATE whose payload touches a non-granted column is rejected with `42501`
    before RLS is consulted at all.
  - `account_status` is in the granted set on purpose:
    `adminService.setAccountStatus` runs against the *caller's own* RLS-scoped
    client by design, and the `protect_account_status` trigger below is what
    stops a caller without `users:suspend` from actually changing it.
  - `last_login_at` is deliberately excluded, so `loginAction` writes it with
    the service-role client — a user cannot forge their own login history.
- RLS: row owner (`id = auth.uid()`) can select/update own row; anyone with
  `users:read` can select any row; anyone with `users:write` can update any
  row.
- **`protect_account_status` trigger** (`before update`, see below) additionally
  guards the `account_status` column specifically, independent of the general
  update policy.
- `account_status` is enforced in two places in application code:
  `loginAction` refuses to leave a suspended account with a live session, and
  `src/proxy.ts` re-checks it on every protected/admin request so an account
  suspended *mid-session* is signed out and redirected to
  `/login?suspended=1`.

### `public.roles` (migration `0001`)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | not null, unique |
| `description` | `text` | nullable |

Seeded with `user` (default role for all signups) and `admin` (full
administrative access — every permission is bundled onto `admin` via
`role_permissions`).

- Grants: `authenticated` → `select`; `service_role` → full CRUD.
- RLS: readable by any `authenticated` user; no write policy for
  `authenticated` (writes are service-role/migration-only).

### `public.permissions` (migration `0001`)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `key` | `text` | not null, unique |
| `description` | `text` | nullable |

Seeded permission keys: `users:read` (read any user profile), `users:write`
(edit any user profile or role), `users:suspend` (suspend/reactivate an
account), `admin:access` (access the admin panel).

- Grants/RLS: same shape as `roles` — `authenticated` gets `select` only.

### `public.role_permissions` (migration `0001`)

Join table, `(role_id, permission_id)` composite PK, both columns
`references ... on delete cascade`. Seeded so every permission is attached to
the `admin` role.

- Grants/RLS: same shape as `roles` — `authenticated` gets `select` only.

### `public.user_roles` (migrations `0001`, `0004`)

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | `references public.users(id) on delete cascade` |
| `role_id` | `uuid` | `references public.roles(id) on delete cascade` |

Composite PK `(user_id, role_id)`. Populated for every new signup by the
`handle_new_user` trigger (assigns the `user` role); the seeded admin account
additionally gets `admin` via `supabase/seed.sql`.

- Grants: `authenticated` → `select` (migration `0001`), plus `insert, delete`
  added in migration `0004`.
- RLS:
  - `0001`: select own rows, or any row with `users:read`.
  - `0004`: insert/delete permitted only with `users:write`
    (`adminService.changeUserRole` deletes the caller's target's existing row
    and inserts a new one, using the caller's own session so this RLS check —
    not just the app-level `requirePermission` call — genuinely gates the
    action).

### `public.files` (migrations `0002`, `0008`)

Generic file-metadata table; first (and currently only) consumer is avatar
upload (`fileService.uploadAvatar`, called both by a user's own settings-page
upload and — with `targetId` in place of the caller's own id — by
`adminService.uploadUserAvatar`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `owner_id` | `uuid` | `references public.users(id) on delete cascade` |
| `bucket` | `text` | not null (e.g. `'avatars'`) |
| `path` | `text` | not null, Storage object path |
| `filename` | `text` | not null, original filename |
| `mime_type` | `text` | not null |
| `size_bytes` | `bigint` | not null |
| `created_at` | `timestamptz` | not null, default `now()` |

- Grants: `authenticated` → full CRUD; `service_role` → full CRUD.
- RLS: owner-only CRUD (`owner_id = auth.uid()`, both `using` and `with
  check`, policy `"files owner crud"`); separately, anyone with `users:read`
  can `select` any row (`"files admin read"`), and — since migration `0008` —
  anyone with `users:write` can `insert` a row for any `owner_id`
  (`"files admin insert"`), which is what lets an admin's own RLS-scoped
  client insert the file record for an avatar uploaded on someone else's
  behalf. Scoped to INSERT only: an admin uploading an avatar has no
  legitimate reason to update or delete another user's unrelated file rows.

### `public.notifications` (migration `0002`)

In-app notification center backing store.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `recipient_id` | `uuid` | `references public.users(id) on delete cascade` |
| `type` | `text` | not null (e.g. `'account_role'`, `'account_status'`) |
| `title` | `text` | not null |
| `message` | `text` | not null |
| `read_at` | `timestamptz` | nullable, set by `markNotificationRead` |
| `created_at` | `timestamptz` | not null, default `now()` |

- Grants: `authenticated` → `select, update` **only** (no `insert` — see
  below); `service_role` → `select, insert, update, delete`.
- RLS: recipient can `select` own rows; recipient can `update` (mark read) own
  rows.
- No INSERT grant for `authenticated`, by design: notifications are only ever
  created server-side via `notifyUser()` using the service-role admin client
  (`createAdminSupabaseClient()`), never directly by a user's own session —
  see the "service-role usage pattern" divergence in `docs/architecture.md`.

### `public.audit_log` (migration `0002`)

Immutable record of admin actions (role changes, account suspend/reactivate).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `actor_id` | `uuid` | `references public.users(id)` (no cascade) |
| `action` | `text` | not null (e.g. `'user.role_changed'`, `'user.status_changed'`) |
| `target_type` | `text` | not null (e.g. `'user'`) |
| `target_id` | `uuid` | not null |
| `metadata` | `jsonb` | not null, default `'{}'` |
| `created_at` | `timestamptz` | not null, default `now()` |

- Grants: `authenticated` → `select` **only**; `service_role` → `select,
  insert` **only** — no `update`/`delete` for *any* role, including
  `service_role`, so audit rows are immutable at the grant level, not just by
  convention.
- RLS: `select` gated behind `users:read`.
- Like `notifications`, rows are only ever inserted via the service-role
  client (`insertAuditLog()`), never directly by a user's own session.

### Storage: `avatars` bucket (migrations `0003`, `0006`, `0008`)

Not a `public` schema table — a Supabase Storage bucket, created via `insert
into storage.buckets (id, name, public) values ('avatars', 'avatars', true)`.
Public (readable by anyone with the URL, matching typical avatar-serving
needs).

- Bucket constraints (migration `0006`): `file_size_limit = 5242880` (5MB,
  matching `MAX_AVATAR_BYTES` in `src/lib/services/fileService.ts`) and
  `allowed_mime_types = {image/png, image/jpeg, image/webp, image/gif}`.
  Storage enforces both itself on every upload path, so they hold even for a
  caller hitting the Storage API directly with a valid JWT (verified live: a
  `text/plain` upload is rejected `415 invalid_mime_type`, a 6MB one `413`).
  `fileService.uploadAvatar` checks the same size and MIME allowlist up front
  so the user gets a clear `ValidationError` instead of an opaque Storage
  error.
- After a successful upload, `fileService.uploadAvatar` writes the object's
  public URL to `public.users.avatar_url`; that is the read path the settings
  page uses to render the current avatar back.

- Policy `"avatar owner or admin upload"` on `storage.objects` (migration
  `0008`, replacing `0003`'s `"avatar owner upload"`): `insert with check
  (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text
  or has_permission(auth.uid(), 'users:write')))` — a user can upload into a
  path prefixed with their own user id as the first folder segment
  (`fileService.uploadAvatar` builds paths as
  `${userId}/${Date.now()}.${ext}`), OR a caller with `users:write` can upload
  into *any* user's folder, which is what lets `adminService.uploadUserAvatar`
  edit another user's avatar through the caller's own RLS-scoped client rather
  than a service-role client. INSERT-only: no update/delete policy exists, and
  uploads must go through with `upsert: false` (storage-js otherwise requires
  SELECT+UPDATE grants on top of INSERT for an upsert request, which this
  policy intentionally doesn't grant — see the comment in
  `src/lib/services/fileService.ts`).

## Functions and triggers

### `has_permission(uid uuid, perm_key text) → boolean` (migration `0001`)

```sql
select exists (
  select 1
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  where ur.user_id = uid and p.key = perm_key
);
```

`security definer`, `stable`. The single source of truth for "does this user
have this permission" — used inside RLS policies, the `protect_account_status`
trigger, `proxy.ts` (via RPC, for the `/admin` route check), and application
code's `lib/permissions.hasPermission`/`requirePermission`. Because RLS
policies and application code both call this same function (application code
via RPC, not by reimplementing the join), the two layers can't drift apart.

### `handle_new_user()` trigger (migration `0001`)

`after insert on auth.users`, `security definer`. Fires once per new Supabase
Auth signup:

1. Inserts a `public.users` row (`id`, `first_name`/`last_name` read from
   `raw_user_meta_data` — populated by `authService.signup`'s
   `options.data`, `email` copied from the new `auth.users` row).
2. Inserts a `public.user_roles` row assigning the new user the `user` role.

This is what makes `public.users` and `user_roles` "just exist" immediately
after `supabase.auth.signUp()` succeeds, with no separate app-level insert
step. `admin` role assignment is manual (via the admin panel, or directly in
`supabase/seed.sql` for the local admin test account) — there is no
self-service path to become an admin.

### `protect_account_status()` trigger (migrations `0001`, `0005`)

`before update on public.users`, `security definer`. Guards the
`account_status` column specifically, independent of the table's general
row-owner UPDATE policy:

```sql
if not public.has_permission(auth.uid(), 'users:suspend') and auth.role() <> 'service_role' then
  new.account_status := old.account_status;
end if;
```

If the caller lacks `users:suspend` (and isn't `service_role`), any attempted
change to `account_status` is silently reverted to its previous value — other
columns in the same UPDATE still go through. This exists because a standard
RLS `UPDATE` policy's `WITH CHECK` clause cannot compare against the
pre-update row within a single statement, so "a user may update their own
profile but not flip their own `account_status`" isn't expressible as a plain
RLS policy and needs a trigger instead.

The permission checked here changed once: migration `0001` originally checked
`users:write`; migration `0005` changed it to `users:suspend` to match the
permission `adminService.setAccountStatus` actually requires at the
application layer (see the corresponding divergence entry in
`docs/architecture.md`).

## Local admin seed account

`supabase/seed.sql` (run by `pnpm supabase db reset`, after all migrations)
inserts a real `auth.users`/`auth.identities` row for `admin@example.com` /
`admin-password-1`, pre-confirmed, mirroring what GoTrue's own signup flow
produces. Inserting into `auth.users` fires `handle_new_user`, which creates
the matching `public.users` row and the default `user` role; the seed script
then **deletes that default assignment and replaces it with** the `admin` role,
so the account ends up with exactly one `user_roles` row.

That single-role invariant matters: `adminService.changeUserRole` enforces it
(it deletes every existing `user_roles` row for the target before inserting the
new one) and `adminService.getUserById` relies on it (`.single()` on the
`user_roles` lookup throws for more than one row). The seed originally added
`admin` *on top of* the trigger's `user` role, which made the bootstrap admin
the one account whose own `/admin/users/<id>` detail page failed. This account
is what
`tests/e2e/admin-journey.spec.ts` signs in as — re-run `pnpm supabase db
reset` before `pnpm test:e2e` to guarantee it exists.
