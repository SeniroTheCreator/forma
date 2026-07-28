-- supabase/migrations/0008_admin_avatar_upload.sql
--
-- 0003_avatars_bucket.sql's "avatar owner upload" policy only allows a caller to INSERT
-- into their OWN avatar folder ((storage.foldername(name))[1] = auth.uid()::text), which is
-- correct for the self-service upload flow but blocks the admin panel's "edit another
-- user's avatar" feature: an admin's own RLS-scoped client can never satisfy that ownership
-- check for someone else's folder, since the folder is keyed on the *target* user's id, not
-- the caller's. Storage policies can call the same has_permission() function table RLS
-- policies use, so this is widened the same way 0001_core_schema.sql's
-- "users update own or with users:write" policy already is: allow the object owner OR a
-- caller holding users:write. This keeps admin avatar uploads genuinely RLS-gated through
-- the caller's own session (adminService.uploadUserAvatar reuses fileService.uploadAvatar
-- with the caller's client, not a service-role client) rather than routing storage access
-- around RLS entirely.

drop policy "avatar owner upload" on storage.objects;

create policy "avatar owner or admin upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_permission(auth.uid(), 'users:write')
    )
  );

-- fileService.uploadAvatar also writes a public.files row via insertFileRecord(), with
-- owner_id set to the AVATAR'S OWNER (the target user), not the caller. 0002's
-- "files owner crud" policy requires owner_id = auth.uid() on every operation including
-- INSERT, which an admin uploading on someone else's behalf can never satisfy — so this
-- adds a second, INSERT-only policy alongside it (additive, "files owner crud" is
-- untouched) permitting a caller with users:write to insert a row for any owner_id. Scoped
-- to INSERT only, unlike the storage/users policies above: an admin uploading an avatar
-- has no reason to update or delete another user's unrelated file rows, and "files admin
-- read" (0002) already covers admin SELECT.
create policy "files admin insert" on public.files
  for insert with check (public.has_permission(auth.uid(), 'users:write'));
