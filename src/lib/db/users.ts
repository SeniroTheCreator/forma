import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function getUserById(supabase: SupabaseClient<Database>, id: string): Promise<UserRow> {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function updateUser(
  supabase: SupabaseClient<Database>,
  id: string,
  fields: Partial<Pick<UserRow, "first_name" | "last_name">>
): Promise<void> {
  const { error } = await supabase.from("users").update(fields).eq("id", id);
  if (error) throw error;
}
