-- supabase/migrations/0001_core_schema.sql

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Seed default roles and permissions
insert into public.roles (name, description) values
  ('user', 'Default role for all signed-up users'),
  ('admin', 'Full administrative access');

insert into public.permissions (key, description) values
  ('users:read', 'Read any user profile'),
  ('users:write', 'Edit any user profile or role'),
  ('users:suspend', 'Suspend or reactivate a user account'),
  ('admin:access', 'Access the admin panel');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p where r.name = 'admin';

-- Trigger: create a public.users row + default 'user' role on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.roles where name = 'user';
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create function public.has_permission(uid uuid, perm_key text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = uid and p.key = perm_key
  );
$$;

create policy "users select own or with users:read" on public.users
  for select using (id = auth.uid() or public.has_permission(auth.uid(), 'users:read'));

create policy "users update own or with users:write" on public.users
  for update using (id = auth.uid() or public.has_permission(auth.uid(), 'users:write'));

create policy "roles readable by authenticated" on public.roles
  for select using (auth.role() = 'authenticated');

create policy "permissions readable by authenticated" on public.permissions
  for select using (auth.role() = 'authenticated');

create policy "role_permissions readable by authenticated" on public.role_permissions
  for select using (auth.role() = 'authenticated');

create policy "user_roles select own or with users:read" on public.user_roles
  for select using (user_id = auth.uid() or public.has_permission(auth.uid(), 'users:read'));

-- Base table grants: RLS policies only restrict which rows a query can see/touch —
-- without an explicit GRANT, PostgREST's anon/authenticated/service_role roles have
-- no access to these tables at all, regardless of policy (and service_role's BYPASSRLS
-- does not remove the need for the underlying GRANT).
grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.users to authenticated;
grant select, insert, update, delete on public.users to service_role;

grant select on public.roles to authenticated;
grant select, insert, update, delete on public.roles to service_role;

grant select on public.permissions to authenticated;
grant select, insert, update, delete on public.permissions to service_role;

grant select on public.role_permissions to authenticated;
grant select, insert, update, delete on public.role_permissions to service_role;

grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.user_roles to service_role;

-- Prevent a user without users:write from reverting/changing their own account_status
-- via a direct update to their own row. RLS's USING clause is reused as the check when
-- an UPDATE policy has no WITH CHECK, but WITH CHECK cannot compare against the
-- pre-update row within a single UPDATE statement — so this is enforced with a
-- BEFORE UPDATE trigger instead, which silently reverts the column change.
create function public.protect_account_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), 'users:write') and auth.role() <> 'service_role' then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

create trigger protect_account_status_trigger
  before update on public.users
  for each row execute function public.protect_account_status();
