import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateResult = { ok: boolean; remaining: number; retryAfterMs: number };

/**
 * In-memory rate limiter — the fallback when Upstash isn't configured. State is
 * per-instance and resets on deploy; fine for a single Railway replica.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}

export function clientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// ── Distributed limiter (Upstash) ────────────────────────────────────────────
// Shared across replicas and survives deploys when UPSTASH_REDIS_REST_URL/TOKEN
// are set. Falls back to the in-memory limiter above when unset OR if Upstash
// errors, so a Redis hiccup can never lock everyone out. Use `limit()` (async)
// from any async handler; the sync `rateLimit()` remains for callers that can't
// await.

let _redis: Redis | null | undefined;
function redis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

const limiters = new Map<string, Ratelimit>();
function limiterFor(limit: number, windowMs: number): Ratelimit | null {
  const r = redis();
  if (!r) return null;
  const cacheKey = `${limit}:${windowMs}`;
  let l = limiters.get(cacheKey);
  if (!l) {
    l = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "rl",
      analytics: false,
    });
    limiters.set(cacheKey, l);
  }
  return l;
}

/** Distributed rate check with an in-memory fallback. Never throws. */
export async function limit(key: string, max = 10, windowMs = 60_000): Promise<RateResult> {
  const l = limiterFor(max, windowMs);
  if (!l) return rateLimit(key, max, windowMs);
  try {
    const res = await l.limit(key);
    return { ok: res.success, remaining: res.remaining, retryAfterMs: Math.max(0, res.reset - Date.now()) };
  } catch {
    return rateLimit(key, max, windowMs); // Upstash unavailable → fail safe to memory
  }
}
