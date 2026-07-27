-- supabase/migrations/0002_files_notifications_audit.sql

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  bucket text not null,
  path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.files enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

create policy "files owner crud" on public.files
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "files admin read" on public.files
  for select using (public.has_permission(auth.uid(), 'users:read'));

create policy "notifications recipient select" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications recipient mark read" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "audit_log admin read" on public.audit_log
  for select using (public.has_permission(auth.uid(), 'users:read'));

-- Base table grants: RLS policies only restrict which rows a query can see/touch —
-- without an explicit GRANT, PostgREST's anon/authenticated/service_role roles have
-- no access to these tables at all, regardless of policy (and service_role's BYPASSRLS
-- does not remove the need for the underlying GRANT). See 0001_core_schema.sql for the
-- lesson this pattern comes from: a first migration attempt there forgot GRANTs entirely
-- and made every table unreachable via the real Data API.

-- files: authenticated can CRUD (RLS narrows this to their own rows via "files owner
-- crud"; "files admin read" separately allows admin SELECT across all rows).
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, update, delete on public.files to service_role;

-- notifications: authenticated gets SELECT + UPDATE only (read their own, mark read).
-- No INSERT grant — notifications are only ever created server-side with the
-- service-role key, never directly by a user's own session.
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;

-- audit_log: authenticated gets SELECT only (gated further by the admin-only RLS
-- policy). No INSERT/UPDATE/DELETE — audit log writes also only ever happen via
-- service-role. service_role itself only gets SELECT + INSERT: nothing in this app
-- ever edits or deletes an audit entry, so UPDATE/DELETE are intentionally withheld
-- even from service_role to keep audit rows immutable.
grant select on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;
