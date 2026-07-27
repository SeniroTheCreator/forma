import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

// Global mock state for controlling behavior per test
const mockState = { success: false, shouldThrow: false };

vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: class {
      static slidingWindow() {
        return {};
      }
      limit = async () => {
        if (mockState.shouldThrow) {
          throw new Error("Redis connection failed: Unable to reach Upstash Redis");
        }
        return { success: mockState.success };
      };
    },
  };
});
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

import { enforceRateLimit } from "./index";
import { RateLimitError } from "@/lib/errors/AppError";

describe("rateLimit", () => {
  afterEach(() => {
    mockState.success = false;
    mockState.shouldThrow = false;
  });

  it("throws RateLimitError when the limiter denies the request", async () => {
    await expect(enforceRateLimit("login:1.2.3.4")).rejects.toThrow(RateLimitError);
  });

  it("resolves without throwing when the limiter allows the request", async () => {
    mockState.success = true;
    await expect(enforceRateLimit("signup:1.2.3.4")).resolves.toBeUndefined();
  });

  it("fails open (resolves without throwing) when rate limiter infra is unreachable", async () => {
    mockState.shouldThrow = true;
    await expect(enforceRateLimit("login:1.2.3.4")).resolves.toBeUndefined();
  });
});
