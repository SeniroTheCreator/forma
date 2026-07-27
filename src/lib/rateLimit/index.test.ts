import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  },
}));
vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: class {
      static slidingWindow() {
        return {};
      }
      limit = vi.fn().mockResolvedValue({ success: false });
    },
  };
});
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

import { enforceRateLimit } from "./index";
import { RateLimitError } from "@/lib/errors/AppError";

describe("rateLimit", () => {
  it("throws RateLimitError when the limiter denies the request", async () => {
    await expect(enforceRateLimit("login:1.2.3.4")).rejects.toThrow(RateLimitError);
  });
});
