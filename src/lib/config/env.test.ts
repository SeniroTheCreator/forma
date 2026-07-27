import { describe, it, expect, beforeEach, vi } from "vitest";

describe("env config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws if a required var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(async () => {
      await import("./env");
    }).rejects.toThrow();
  });

  it("parses valid env vars into a typed object", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const { env } = await import("./env");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });
});
