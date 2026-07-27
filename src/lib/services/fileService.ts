import type { SupabaseClient } from "@supabase/supabase-js";
import { insertFileRecord } from "@/lib/db/files";
import { updateUser } from "@/lib/db/users";
import { ValidationError } from "@/lib/errors/AppError";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Kept in sync with the `avatars` bucket's allowed_mime_types
// (supabase/migrations/0006_avatars_bucket_limits.sql). Storage enforces the same list
// itself — this check exists so an invalid file is rejected with a clear ValidationError
// before it is uploaded at all, rather than as an opaque Storage error afterwards.
const ALLOWED_AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ValidationError("Avatar must be 5MB or smaller");
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    throw new ValidationError("Avatar must be a PNG, JPEG, WebP or GIF image");
  }

  // Path is prefixed with the user's id as a folder segment so the storage RLS
  // policy's `(storage.foldername(name))[1] = auth.uid()::text` check can match it
  // (see supabase/migrations/0003_avatars_bucket.sql).
  const path = `${userId}/${Date.now()}.${file.name.split(".").pop()}`;

  // upsert:false (not true, despite the original plan snippet) -- storage-js always sends
  // an `x-upsert` header, and live-testing against the real Storage API showed that
  // `x-upsert: true` makes the Storage API require SELECT+INSERT+UPDATE RLS permissions
  // (per storage-js's own upload() JSDoc: "select, insert and update when you are
  // upserting files"), which our "avatar owner upload" policy (INSERT-only) does not
  // grant -- every such upload was rejected with a 403 "new row violates row-level
  // security policy". Since the path already includes Date.now() and is therefore always
  // a brand-new object key, upsert is never actually needed here, and upsert:false lets
  // the INSERT-only policy suffice.
  const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
  if (error) throw error;

  await insertFileRecord(supabase, {
    owner_id: userId,
    bucket: "avatars",
    path: data.path,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });

  // Without this the upload was write-only: the object landed in the bucket and a `files`
  // row was written, but nothing recorded WHICH object is the user's current avatar, so
  // every page load rendered the "No avatar" placeholder again. `users.avatar_url`
  // (0007_users_avatar_url_and_column_grants.sql) is that pointer, and the settings page
  // reads it back. The bucket is public, so a plain public URL is all that's needed.
  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
  await updateUser(supabase, userId, { avatar_url: publicUrlData.publicUrl });

  return { path: data.path, publicUrl: publicUrlData.publicUrl };
}
