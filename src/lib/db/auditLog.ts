import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AuditLogInsert = Database["public"]["Tables"]["audit_log"]["Insert"];

export async function insertAuditLog(supabase: SupabaseClient<Database>, row: AuditLogInsert): Promise<void> {
  const { error } = await supabase.from("audit_log").insert(row);
  if (error) throw error;
}
