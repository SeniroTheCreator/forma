-- supabase/migrations/0004_user_roles_write_access.sql
--
-- 0001_core_schema.sql granted `authenticated` only SELECT on public.user_roles
-- (policy: "user_roles select own or with users:read"). The admin user-management
-- panel (Task 21) needs to reassign a target user's role — i.e. delete their
-- existing user_roles row and insert a new one — using the caller's own
-- authenticated session (not the service-role key), so that RLS/has_permission
-- genuinely gates the action. This migration adds the missing INSERT/DELETE
-- grants and matching RLS policies, following the exact grant+policy style
-- established in 0001_core_schema.sql / 0002_files_notifications_audit.sql.

create policy "user_roles insert with users:write" on public.user_roles
  for insert with check (public.has_permission(auth.uid(), 'users:write'));

create policy "user_roles delete with users:write" on public.user_roles
  for delete using (public.has_permission(auth.uid(), 'users:write'));

grant insert, delete on public.user_roles to authenticated;
