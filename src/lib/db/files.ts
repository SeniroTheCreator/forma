import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type FileInsert = Database["public"]["Tables"]["files"]["Insert"];
type FileRow = Database["public"]["Tables"]["files"]["Row"];

export async function insertFileRecord(supabase: SupabaseClient<Database>, row: FileInsert): Promise<FileRow> {
  const { data, error } = await supabase.from("files").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFileRecord(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw error;
}
