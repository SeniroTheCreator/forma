import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserById, updateUser } from "@/lib/db/users";
import { ForbiddenError } from "@/lib/errors/AppError";

export async function getProfile(supabase: SupabaseClient, callerId: string, targetId: string) {
  if (callerId !== targetId) throw new ForbiddenError("Cannot view another user's profile");
  return getUserById(supabase, targetId);
}

export async function updateProfile(
  supabase: SupabaseClient,
  callerId: string,
  targetId: string,
  input: { firstName: string; lastName: string }
): Promise<void> {
  if (callerId !== targetId) throw new ForbiddenError("Cannot update another user's profile");
  await updateUser(supabase, targetId, { first_name: input.firstName, last_name: input.lastName });
}
