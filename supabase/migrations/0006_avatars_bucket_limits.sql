-- supabase/migrations/0006_avatars_bucket_limits.sql
--
-- 0003_avatars_bucket.sql created the `avatars` bucket with an owner-scoped
-- INSERT policy but no size or content-type constraints at the Storage level.
-- The only size check lived in application code (fileService.uploadAvatar's
-- 5MB guard) and there was no MIME check anywhere — so anything reachable via
-- the Storage API directly (bypassing the Server Action) could upload a file
-- of any size and any content type into a *public* bucket, i.e. arbitrary
-- file hosting under this project's domain.
--
-- Storage enforces `file_size_limit` and `allowed_mime_types` itself, on every
-- upload path, regardless of which client made the call. The app-level checks
-- in fileService.uploadAvatar stay (they produce a friendly ValidationError
-- before a pointless network round trip); these are the independent
-- defense-in-depth layer underneath them, and the 5MB limit here deliberately
-- matches MAX_AVATAR_BYTES in src/lib/services/fileService.ts.

update storage.buckets
set
  file_size_limit = 5242880, -- 5 * 1024 * 1024, matches MAX_AVATAR_BYTES
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'avatars';
