import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNotification, listNotificationsForUser, markNotificationRead } from "@/lib/db/notifications";
import { NotFoundError } from "@/lib/errors/AppError";

export async function listForUser(supabase: SupabaseClient, callerId: string) {
  return listNotificationsForUser(supabase, callerId);
}

/**
 * Marks one of the caller's own notifications read.
 *
 * The update is scoped to `callerId`, and a 0-row result becomes a NotFoundError rather
 * than a silent success: relying on RLS alone (as the route handler previously did by
 * calling the db layer directly with no auth check at all) means another user's id, or a
 * nonexistent one, returns `{success: true}` having changed nothing.
 */
export async function markRead(supabase: SupabaseClient, callerId: string, notificationId: string): Promise<void> {
  const updated = await markNotificationRead(supabase, notificationId, callerId);
  if (updated === 0) throw new NotFoundError("Notification not found");
}

export async function notifyUser(
  adminSupabase: SupabaseClient,
  recipientId: string,
  input: { type: string; title: string; message: string }
): Promise<void> {
  await insertNotification(adminSupabase, {
    recipient_id: recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
  });
}
