-- supabase/migrations/0005_fix_account_status_permission.sql
--
-- 0001_core_schema.sql's protect_account_status trigger checked
-- has_permission(auth.uid(), 'users:write') to decide whether a direct UPDATE may
-- change account_status. But the application-level guard for this action
-- (adminService.setAccountStatus) requires the more specific 'users:suspend'
-- permission, not 'users:write'. With the current two-role seed data both
-- permissions happen to be bundled onto the same 'admin' role, so this was
-- masked — but the DB-level trigger provided no real independent
-- defense-in-depth for the users:suspend boundary specifically: a future role
-- granted 'users:write' without 'users:suspend' could flip any account's
-- status directly via the Data API despite failing the app-level check.
--
-- This migration replaces the trigger function so the DB-level guard matches
-- the actual permission boundary the application enforces.

create or replace function public.protect_account_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission(auth.uid(), 'users:suspend') and auth.role() <> 'service_role' then
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;
