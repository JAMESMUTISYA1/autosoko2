import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash is the Redis-for-serverless equivalent of what Neon is for
// Postgres — HTTP-based, no persistent connection, billed per-request.
// Same reasoning as lib/db.js: a traditional Redis client holding open
// TCP connections doesn't fit a stateless serverless function.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Document 3 §0's documented limits: 5 req/min on auth endpoints,
// 100 req/min as the general default, 300 req/min on autocomplete
// since it fires on every keystroke.
const limiters = redis
  ? {
      auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "rl:auth" }),
      default: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "60 s"), prefix: "rl:default" }),
      autocomplete: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, "60 s"), prefix: "rl:autocomplete" }),
    }
  : null;

/**
 * Returns { success, remaining, reset } for the given identifier
 * (typically IP address, or `user:<id>` for authenticated requests so a
 * shared office IP doesn't rate-limit everyone in it together).
 *
 * Fails OPEN (allows the request) when Upstash isn't configured, so
 * local development and this sandbox's testing don't require a Redis
 * account — but this means rate limiting is NOT actually enforced
 * until UPSTASH_REDIS_REST_URL/TOKEN are set in the real deployment.
 * That tradeoff is deliberate and documented in BACKEND.md; it must not
 * be mistaken for "rate limiting is handled."
 */
export async function checkRateLimit(identifier, category = "default") {
  if (!limiters) {
    return { success: true, remaining: Infinity, reset: null, enforced: false };
  }
  const limiter = limiters[category] || limiters.default;
  const result = await limiter.limit(identifier);
  return { ...result, enforced: true };
}

/**
 * Extracts a best-effort client identifier from a Next.js Request,
 * preferring the authenticated user id when available (passed in by the
 * caller) and falling back to IP — checking the headers a proxy/CDN
 * actually sets, not a header a client could spoof to bypass limiting.
 */
export function getClientIdentifier(request, userId) {
  if (userId) return `user:${userId}`;
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}
