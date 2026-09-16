import "server-only";
import { createHmac } from "node:crypto";

/** Shared rate limiter with a distributed Upstash backend and bounded local fallback. */

export type RateLimitMode = "availability" | "strict";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /**
   * strict: in production, deny with outcome=unavailable when the distributed
   * limiter is missing/misconfigured/down. availability: fall back locally.
   */
  mode?: RateLimitMode;
}

export type RateLimitResult =
  | {
      ok: true;
      outcome: "allowed";
      backend: "redis" | "memory";
      remaining: number;
      retryAfterMs: 0;
    }
  | {
      ok: false;
      outcome: "limited";
      backend: "redis" | "memory";
      remaining: 0;
      retryAfterMs: number;
    }
  | {
      ok: false;
      outcome: "unavailable";
      backend: "unavailable";
      remaining: 0;
      retryAfterMs: 0;
    };

type MemoryEntry = { hits: number[]; windowMs: number; lastSeen: number };
const store = new Map<string, MemoryEntry>();
const MAX_KEYS = 5_000;
let configurationWarningEmitted = false;

function validateOptions({ limit, windowMs }: RateLimitOptions): void {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("rate-limit: limit must be a positive safe integer");
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error("rate-limit: windowMs must be a positive safe integer");
  }
}

function evictMemoryEntries(now: number, preserveKey: string): void {
  for (const [key, entry] of store) {
    entry.hits = entry.hits.filter((time) => time > now - entry.windowMs);
    if (entry.hits.length === 0 && key !== preserveKey) store.delete(key);
  }
  if (store.size <= MAX_KEYS) return;

  const oldest = [...store.entries()]
    .filter(([key]) => key !== preserveKey)
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  for (const [key] of oldest) {
    if (store.size <= MAX_KEYS) break;
    store.delete(key);
  }
}

function memoryRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const previous = store.get(key);
  const hits = (previous?.hits ?? []).filter((time) => time > cutoff);
  const entry: MemoryEntry = { hits, windowMs, lastSeen: now };

  if (hits.length >= limit) {
    store.set(key, entry);
    evictMemoryEntries(now, key);
    return {
      ok: false,
      outcome: "limited",
      backend: "memory",
      remaining: 0,
      retryAfterMs: Math.max(1, hits[0] + windowMs - now),
    };
  }

  hits.push(now);
  store.set(key, entry);
  if (store.size > MAX_KEYS) evictMemoryEntries(now, key);
  return {
    ok: true,
    outcome: "allowed",
    backend: "memory",
    remaining: limit - hits.length,
    retryAfterMs: 0,
  };
}

async function redisRateLimit(
  restUrl: string,
  token: string,
  key: string,
  { limit, windowMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const redisKey = `rl:${key}:${windowStart}`;
  const response = await fetch(`${restUrl.replace(/\/$/, "")}/pipeline`, {
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
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);

  const results = (await response.json()) as { result?: unknown }[];
  const count = Number(results?.[0]?.result);
  if (!Number.isFinite(count)) {
    throw new Error("Upstash pipeline returned an unexpected shape");
  }
  if (count > limit) {
    return {
      ok: false,
      outcome: "limited",
      backend: "redis",
      remaining: 0,
      retryAfterMs: Math.max(1, windowStart + windowMs - now),
    };
  }
  return {
    ok: true,
    outcome: "allowed",
    backend: "redis",
    remaining: Math.max(0, limit - count),
    retryAfterMs: 0,
  };
}

function unavailable(): RateLimitResult {
  return {
    ok: false,
    outcome: "unavailable",
    backend: "unavailable",
    remaining: 0,
    retryAfterMs: 0,
  };
}

/** Record one request. Strict mode closes only in production. */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  validateOptions(options);
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const strictProduction =
    options.mode === "strict" && process.env.NODE_ENV === "production";
  const partiallyConfigured = Boolean(restUrl) !== Boolean(token);

  if (partiallyConfigured && !configurationWarningEmitted) {
    configurationWarningEmitted = true;
    console.error(
      "rate-limit: partial Upstash configuration; set both REST URL and token.",
    );
  }

  if (restUrl && token) {
    try {
      return await redisRateLimit(restUrl, token, key, options);
    } catch (error) {
      console.error(
        `rate-limit: Upstash unavailable${strictProduction ? " (closed)" : ", using bounded memory fallback"} —`,
        error instanceof Error ? error.message : error,
      );
      if (strictProduction) return unavailable();
    }
  } else if (strictProduction) {
    return unavailable();
  }

  return memoryRateLimit(key, options);
}

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  if (candidate.length < 3 || candidate.length > 64) return null;
  return /^[0-9a-f:.]+$/i.test(candidate) ? candidate.toLowerCase() : null;
}

/** Accepts Request in route handlers or Headers from next/headers in actions. */
export function clientIp(source: Request | Headers): string {
  const headers = source instanceof Headers ? source : source.headers;
  const realIp = normalizeIp(headers.get("x-real-ip"));
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      const ip = normalizeIp(parts[index]);
      if (ip) return ip;
    }
  }
  return "unknown";
}

function limiterHashSecret(): string {
  return (
    process.env.RATE_LIMIT_HASH_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    "fasteno-local-rate-limit-key"
  );
}

/** One-way/HMAC an IP, email or other target before it enters a limiter key. */
export function hashRateLimitTarget(value: string): string {
  return createHmac("sha256", limiterHashSecret())
    .update(value.normalize("NFKC").trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function rateLimitKey(scope: string, ...targets: string[]): string {
  return `${scope}:${targets.map(hashRateLimitTarget).join(":")}`;
}

export const RATE_LIMIT_MESSAGE =
  "Too many requests from your network. Please wait a minute and try again.";
export const RATE_LIMIT_UNAVAILABLE_MESSAGE =
  "This service is temporarily unavailable. Please try again shortly.";
