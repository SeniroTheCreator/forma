import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/config/env";
import { RateLimitError } from "@/lib/errors/AppError";

const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
});

export async function enforceRateLimit(key: string): Promise<void> {
  const { success } = await ratelimit.limit(key);
  if (!success) {
    throw new RateLimitError("Too many requests. Please try again shortly.");
  }
}
