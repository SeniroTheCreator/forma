import { describe, it, expect, beforeEach, vi } from "vitest";

describe("publicEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("parses public env vars successfully", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const { publicEnv } = await import("./publicEnv");
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co"
    );
    expect(publicEnv.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("throws if a required public var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    await expect(async () => {
      await import("./publicEnv");
    }).rejects.toThrow();
  });

  it("imports successfully without server-only guard in jsdom environment", async () => {
    // This test runs in jsdom by default (unlike env.test.ts which is node)
    // It verifies that publicEnv has no server-only import and can be imported
    // in a client-like environment
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    // If publicEnv had a server-only import, this would throw in jsdom
    // But it doesn't, so this succeeds
    const { publicEnv } = await import("./publicEnv");
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co"
    );
  });
});
