import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNotification } from "@/lib/db/notifications";

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
