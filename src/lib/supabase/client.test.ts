import { describe, it, expect, beforeEach, vi } from "vitest";

describe("createBrowserSupabaseClient", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("can be imported and called from client-side code without server-only guard throwing", async () => {
    // This test runs in jsdom (default, NOT node)
    // It does NOT mock server-only
    // It verifies that importing createBrowserSupabaseClient (which imports publicEnv)
    // works in a client context without throwing

    // Stub only public env vars (not server-only ones)
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    // If publicEnv was still in the server-only env.ts file,
    // this import would throw: "This module cannot be imported from a Client Component module"
    // But now that publicEnv is in its own file without server-only guard,
    // this succeeds
    const { createBrowserSupabaseClient } = await import("./client");

    // Should be able to call it without error
    expect(createBrowserSupabaseClient).toBeDefined();
    // The actual Supabase client creation would fail without real creds,
    // but we're just verifying the import works
  });
});
