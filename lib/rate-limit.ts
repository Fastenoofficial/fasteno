/** Rate limiter for abuse-prone API routes (checkout, coupon).
 *
 *  Two backends, picked automatically:
 *  - Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set):
 *    a fixed-window counter shared by ALL serverless instances — real global
 *    limits in production. Plain REST via fetch; no SDK dependency.
 *  - In-memory sliding window otherwise: per-instance only (each warm lambda
 *    keeps its own counters) — fine for local dev and as a fallback.
 *
 *  Redis failures fail OPEN to the in-memory limiter (with a logged error):
 *  a rate-limit outage must never take checkout down with it.
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

// ── In-memory backend ──────────────────────────────────────────────────

const store = new Map<string, number[]>();
const MAX_KEYS = 5_000;

function memoryRateLimit(
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

// ── Upstash Redis backend ──────────────────────────────────────────────

async function redisRateLimit(
  restUrl: string,
  token: string,
  key: string,
  { limit, windowMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  // One counter per key per window; expiry a little past the window end so
  // stale counters clean themselves up. PEXPIRE NX = only set expiry on the
  // INCR that created the key.
  const redisKey = `rl:${key}:${windowStart}`;
  const res = await fetch(`${restUrl.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(windowMs + 1_000), "NX"],
    ]),
    signal: AbortSignal.timeout(2_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);

  const results = (await res.json()) as { result?: unknown }[];
  const count = Number(results?.[0]?.result);
  if (!Number.isFinite(count)) {
    throw new Error("Upstash pipeline returned an unexpected shape");
  }

  if (count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, windowStart + windowMs - now),
    };
  }
  return { ok: true, remaining: limit - count, retryAfterMs: 0 };
}

// ── Public API ─────────────────────────────────────────────────────────

/** Record a hit for `key` and report whether it is within the limit. */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (restUrl && token) {
    try {
      return await redisRateLimit(restUrl, token, key, options);
    } catch (err) {
      console.error(
        "rate-limit: Upstash unavailable, falling back to in-memory —",
        err instanceof Error ? err.message : err,
      );
    }
  }
  return memoryRateLimit(key, options);
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
