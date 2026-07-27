import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/env";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
