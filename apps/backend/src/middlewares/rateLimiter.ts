import type { Context, Next } from "hono";
import { ApiError } from "./errorHandler.js";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: { maxRequests: number; windowMs: number }) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("x-real-ip") ||
      "local_client";

    const key = `rate_limit:${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || record.resetAt < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
    } else {
      record.count += 1;
      if (record.count > options.maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        throw new ApiError(
          429,
          `Too Many Requests. Rate limit of ${options.maxRequests} requests per ${options.windowMs / 1000}s exceeded. Please try again in ${retryAfter}s.`
        );
      }
    }

    c.header("X-RateLimit-Limit", String(options.maxRequests));
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, options.maxRequests - (record ? record.count : 1)))
    );

    await next();
  };
}
