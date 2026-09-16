import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SITE_URL } from "@/lib/config";
import { createServiceClient } from "@/lib/supabase/service";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const COOKIE_PREFIX = "fs_go_";

export interface GuestOrderCredential {
  token: string;
  expiresAt: string;
}

export function hashGuestOrderToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isGuestOrderTokenShape(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

export function guestOrderCookieName(orderId: string): string {
  return `${COOKIE_PREFIX}${orderId.replace(/-/g, "")}`;
}

export function guestOrderCookiePath(orderId: string): string {
  return `/order/${encodeURIComponent(orderId)}`;
}

export function guestOrderAccessUrl(orderId: string, token: string): string {
  const url = new URL(
    `${guestOrderCookiePath(orderId)}/access`,
    SITE_URL.endsWith("/") ? SITE_URL : `${SITE_URL}/`,
  );
  url.searchParams.set("token", token);
  return url.toString();
}

/** Create and persist a 256-bit bearer credential; only its SHA-256 is stored. */
type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

export async function issueGuestOrderCredential(
  orderId: string,
  ttlMs = DEFAULT_TTL_MS,
  existingService?: ServiceClient,
): Promise<GuestOrderCredential | null> {
  const service = existingService ?? createServiceClient();
  if (!service || !Number.isSafeInteger(ttlMs) || ttlMs < 60_000) return null;

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id, user_id")
    .eq("id", orderId)
    .is("user_id", null)
    .maybeSingle();
  if (orderError || !order) {
    if (orderError) {
      console.error("guest-order-access: guest lookup failed —", orderError.message);
    }
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const { error } = await service.from("guest_order_access_tokens").insert({
    order_id: orderId,
    token_hash: hashGuestOrderToken(token),
    expires_at: expiresAt,
  });
  if (error) {
    console.error("guest-order-access: credential insert failed —", error.message);
    return null;
  }
  return { token, expiresAt };
}

export async function validateGuestOrderCredential(
  orderId: string,
  token: unknown,
): Promise<{ valid: boolean; expiresAt?: string }> {
  if (!isGuestOrderTokenShape(token)) return { valid: false };
  const service = createServiceClient();
  if (!service) return { valid: false };

  const now = new Date().toISOString();
  const { data, error } = await service
    .from("guest_order_access_tokens")
    .select("expires_at, orders!inner(user_id)")
    .eq("order_id", orderId)
    .eq("token_hash", hashGuestOrderToken(token))
    .is("revoked_at", null)
    .gt("expires_at", now)
    .is("orders.user_id", null)
    .maybeSingle();
  if (error) {
    console.error("guest-order-access: credential validation failed —", error.message);
    return { valid: false };
  }
  return data
    ? { valid: true, expiresAt: String(data.expires_at) }
    : { valid: false };
}

export async function readGuestOrderCredential(orderId: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(guestOrderCookieName(orderId))?.value ?? null;
}

export async function revokeGuestOrderCredentials(orderId: string): Promise<boolean> {
  const service = createServiceClient();
  if (!service) return false;
  const { error } = await service
    .from("guest_order_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("revoked_at", null);
  if (error) {
    console.error("guest-order-access: credential revocation failed —", error.message);
    return false;
  }
  return true;
}
