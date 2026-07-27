"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as userService from "@/lib/services/userService";
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
