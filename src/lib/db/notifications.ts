import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export async function listNotificationsForUser(supabase: SupabaseClient<Database>, userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function insertNotification(supabase: SupabaseClient<Database>, row: NotificationInsert): Promise<void> {
  const { error } = await supabase.from("notifications").insert(row);
  if (error) throw error;
}
