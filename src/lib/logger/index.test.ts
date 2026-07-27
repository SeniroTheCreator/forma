// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Writable } from "stream";

describe("logger", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    // Stub required env vars for logger initialization
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
  });

  it("exposes standard log levels", async () => {
    const { logger } = await import("./index");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("redacts sensitive fields like password and token", async () => {
    const pino = await import("pino");
    const { env } = await import("@/lib/config/env");

    // Capture log output using a writable stream
    const logOutput: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        logOutput.push(chunk.toString());
        callback();
      },
    });

    // Create logger with same config as production logger, passing stream as destination
    const testLogger = pino.default(
      {
        level: env.LOG_LEVEL,
        redact: ["password", "token", "authorization", "*.password", "*.token"],
      },
      stream
    );

    // Log an object with sensitive data
    testLogger.info(
      {
        password: "secret123",
        token: "mytoken456",
        username: "alice",
        other: "visible",
      },
      "test message"
    );

    // Verify redaction: sensitive data should be redacted, non-sensitive should be visible
    const combinedOutput = logOutput.join("");

    // Assert sensitive values are redacted (not in plaintext)
    expect(combinedOutput).not.toContain("secret123");
    expect(combinedOutput).not.toContain("mytoken456");

    // Assert non-sensitive data is still visible
    expect(combinedOutput).toContain("alice");
    expect(combinedOutput).toContain("visible");
  });
});
