import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export async function listNotificationsForUser(supabase: SupabaseClient<Database>, userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Marks a notification read, scoped to its recipient.
 *
 * The recipient filter is explicit rather than left to RLS: RLS's cross-user UPDATE denial
 * is a silent 0-row no-op (verified against the live database in Task 21), so without it
 * the caller cannot tell "marked read" apart from "that isn't yours" or "no such id".
 * Returns the number of rows actually updated so the service layer can turn 0 into a 404.
 */
export async function markNotificationRead(
  supabase: SupabaseClient<Database>,
  id: string,
  recipientId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", recipientId)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function insertNotification(supabase: SupabaseClient<Database>, row: NotificationInsert): Promise<void> {
  const { error } = await supabase.from("notifications").insert(row);
  if (error) throw error;
}
