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
  // Only the columns `authenticated` holds an UPDATE grant on via
  // 0007_users_avatar_url_and_column_grants.sql are updatable through a user's own
  // session; anything else (email, last_login_at, created_at) is rejected by Postgres
  // with 42501 before RLS is even consulted.
  fields: Partial<Pick<UserRow, "first_name" | "last_name" | "avatar_url">>
): Promise<void> {
  const { error } = await supabase.from("users").update(fields).eq("id", id);
  if (error) throw error;
}
