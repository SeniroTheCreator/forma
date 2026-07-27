-- supabase/migrations/0007_users_avatar_url_and_column_grants.sql
--
-- Two related changes to public.users:
--
-- 1. `avatar_url` column. Avatar upload was previously write-only: files landed
--    in the `avatars` bucket and a row was written to `public.files`, but
--    nothing ever read the current avatar back, so the settings page always
--    rendered the "No avatar" placeholder after a reload. There was no column
--    to hang the current avatar off of and no query that could pick "the most
--    recent avatar for this user" without scanning `files`. A nullable text
--    column on `users` is the simplest read path and is what
--    fileService.uploadAvatar now writes after a successful upload.
--
-- 2. Column-scoped UPDATE grant. 0001_core_schema.sql granted `authenticated`
--    a blanket `update` on public.users, covering *every* column — combined
--    with the "users update own ..." RLS policy, any logged-in user could
--    PATCH their own `email`, `created_at`, `updated_at` or `last_login_at`
--    directly through the Data API (RLS allowed the row; nothing restricted
--    the columns). Postgres column-level privileges are the right tool here:
--    an UPDATE whose payload touches a non-granted column is rejected with
--    42501 before RLS is even consulted.
--
--    The granted set is exactly what the application legitimately updates
--    through a user's own session:
--      - first_name / last_name  -> userService.updateProfile
--      - avatar_url              -> fileService.uploadAvatar
--      - account_status          -> adminService.setAccountStatus
--
--    `account_status` has to stay in the grant because setAccountStatus
--    deliberately runs against the *caller's own* RLS-scoped client (see
--    divergence #3 in docs/architecture.md) rather than the service-role
--    client, so that has_permission/RLS genuinely gates it. It is not a hole:
--    the `protect_account_status` trigger (0005) independently reverts any
--    account_status change made by a caller lacking `users:suspend`, and the
--    "users update own or with users:write" RLS policy still governs which
--    rows are reachable at all.
--
--    Notably NOT granted: `email` (identity lives in auth.users; changing it
--    here would silently desync the mirror), `last_login_at` (system-set —
--    loginAction now writes it with the service-role client), `created_at`,
--    `updated_at`, and `id`.

alter table public.users add column avatar_url text;

revoke update on public.users from authenticated;
grant update (first_name, last_name, avatar_url, account_status) on public.users to authenticated;
