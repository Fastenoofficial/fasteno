/** Simple in-memory sliding-window rate limiter.
 *
 *  Per-serverless-instance only (each warm lambda keeps its own counters) —
 *  good enough as a v1 abuse brake for checkout/coupon endpoints. Swap for
 *  Upstash/Redis if global limits are ever needed.
 */

export interface RateLimitOptions {
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** How long (ms) until a slot frees up. 0 when ok. */
  retryAfterMs: number;
}

const store = new Map<string, number[]>();
const MAX_KEYS = 5_000;

/** Record a hit for `key` and report whether it is within the limit. */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    store.set(key, hits);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, hits[0] + windowMs - now),
    };
  }

  hits.push(now);
  store.set(key, hits);

  // Opportunistic cleanup so the map can't grow without bound.
  if (store.size > MAX_KEYS) {
    for (const [k, v] of store) {
      if (v.every((t) => t <= cutoff)) store.delete(k);
    }
  }

  return { ok: true, remaining: limit - hits.length, retryAfterMs: 0 };
}

/** Trusted client IP for rate-limit keys.
 *
 *  A client can send its own `X-Forwarded-For`, and Vercel APPENDS the real
 *  peer IP to the right of whatever arrives — so the LEFT-most token is
 *  attacker-controlled and must never be trusted for a security limit.
 *  We therefore prefer `x-real-ip` (Vercel overwrites this with the true peer
 *  IP), then fall back to the RIGHT-most `x-forwarded-for` hop (the one the
 *  platform appended). Behind a single trusted proxy both resolve to the real
 *  client; a spoofed left-most value is ignored. */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "unknown";
}

/** Standard 429 body used by the API routes. */
export const RATE_LIMIT_MESSAGE =
  "Too many requests from your network. Please wait a minute and try again.";
