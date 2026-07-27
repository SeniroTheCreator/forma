// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("env (server-only)", () => {
  beforeEach(() => {
    // Clear any previously stubbed env vars
    vi.unstubAllEnvs();
    vi.resetModules();
    // Mock server-only to allow testing in Vitest environment
    vi.doMock("server-only", () => ({}));
  });

  describe("env", () => {
    it("parses all env vars including server-only ones", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
      vi.stubEnv("RESEND_API_KEY", "resend-key");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
      const { env } = await import("./env");
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
      expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-key");
    });

    it("throws if a server-only var is missing", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
      // Missing server-only vars - import should fail with eager validation
      await expect(async () => {
        await import("./env");
      }).rejects.toThrow();
    });
  });
});
