import type { SupabaseClient } from "@supabase/supabase-js";
import { insertFileRecord } from "@/lib/db/files";
import { ValidationError } from "@/lib/errors/AppError";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function uploadAvatar(supabase: SupabaseClient, userId: string, file: File): Promise<{ path: string }> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ValidationError("Avatar must be 5MB or smaller");
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

  return { path: data.path };
}
