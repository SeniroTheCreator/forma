import type { SupabaseClient } from "@supabase/supabase-js";
import { ForbiddenError } from "@/lib/errors/AppError";

export async function hasPermission(supabase: SupabaseClient, userId: string, permissionKey: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", { uid: userId, perm_key: permissionKey });
  if (error) throw error;
  return Boolean(data);
}

export async function requirePermission(supabase: SupabaseClient, userId: string, permissionKey: string): Promise<void> {
  const allowed = await hasPermission(supabase, userId, permissionKey);
  if (!allowed) {
    throw new ForbiddenError(`Missing required permission: ${permissionKey}`);
  }
}
