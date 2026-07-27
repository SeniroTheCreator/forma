"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as userService from "@/lib/services/userService";
import * as fileService from "@/lib/services/fileService";
import { profileSchema } from "@/lib/validation/userSchemas";
import { mapErrorToResponse, AuthError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";

export async function updateProfileAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AuthError("Not authenticated");

    await userService.updateProfile(supabase, user.id, user.id, parsed.data);
    return {};
  } catch (err) {
    logger.warn({ err }, "update profile failed");
    return { error: mapErrorToResponse(err).body.error };
  }
}

export async function uploadAvatarAction(formData: FormData): Promise<{ error?: string; url?: string }> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AuthError("Not authenticated");

    const { path } = await fileService.uploadAvatar(supabase, user.id, file);
    // Resolved server-side (rather than in the client component) since the public URL
    // is a pure string transform of NEXT_PUBLIC_SUPABASE_URL + path — no need for a
    // second, browser-side Supabase client just to compute it.
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    logger.warn({ err }, "avatar upload failed");
    return { error: mapErrorToResponse(err).body.error };
  }
}
