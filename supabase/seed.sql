-- supabase/seed.sql
--
-- Seeds a real, authenticatable Supabase Auth user (admin@example.com /
-- admin-password-1) with the `admin` role, so the e2e suite
-- (tests/e2e/admin-journey.spec.ts) is self-contained on `pnpm supabase db reset`.
--
-- GoTrue (Supabase Auth) does not expose a SQL "create user" helper, so this
-- inserts directly into auth.users + auth.identities, mirroring the row
-- shape GoTrue itself produces for an email/password signup:
--   - encrypted_password uses pgcrypto's crypt(password, gen_salt('bf')),
--     which is the bcrypt format GoTrue expects and verifies against on login.
--   - email_confirmed_at is set (auto-confirm is also on via
--     supabase/config.toml's enable_confirmations = false, but this makes the
--     seed correct even if that setting changes).
--   - an auth.identities row is added for the "email" provider, matching what
--     GoTrue's signup flow creates alongside the auth.users row.
--
-- Inserting into auth.users fires the `on_auth_user_created` trigger
-- (0001_core_schema.sql's handle_new_user), which creates the matching
-- public.users row and assigns the default 'user' role. The 'admin' role is
-- then additionally assigned below, since the trigger only grants 'user'.

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  admin_role_id uuid;
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('admin-password-1', gen_salt('bf')),
    now(),
    null,
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"first_name": "Admin", "last_name": "User"}'::jsonb,
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null,
    false
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    admin_id::text,
    admin_id,
    jsonb_build_object('sub', admin_id::text, 'email', 'admin@example.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  );

  -- The on_auth_user_created trigger has already created the public.users row
  -- and assigned the default 'user' role. Additionally grant 'admin'.
  select id into admin_role_id from public.roles where name = 'admin';

  insert into public.user_roles (user_id, role_id)
  values (admin_id, admin_role_id)
  on conflict do nothing;
end $$;
