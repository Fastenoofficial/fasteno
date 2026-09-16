import { NextRequest, NextResponse } from "next/server";
import {
  guestOrderCookieName,
  guestOrderCookiePath,
  validateGuestOrderCredential,
} from "@/lib/guest-order-access";
import { readBoundedJson } from "@/lib/request-body";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

async function exchangeCredential(
  request: NextRequest,
  id: string,
  token: unknown,
  redirect: boolean,
) {
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Order access was not found." },
      { status: 404 },
    );
  }

  const limited = await rateLimit(
    rateLimitKey("guest-order-access", clientIp(request), id),
    { limit: 20, windowMs: 60_000, mode: "strict" },
  );
  if (!limited.ok) {
    const unavailable = limited.outcome === "unavailable";
    return NextResponse.json(
      {
        error: unavailable
          ? RATE_LIMIT_UNAVAILABLE_MESSAGE
          : RATE_LIMIT_MESSAGE,
      },
      {
        status: unavailable ? 503 : 429,
        headers:
          limited.outcome === "limited"
            ? {
                "Retry-After": String(
                  Math.ceil(limited.retryAfterMs / 1_000),
                ),
              }
            : undefined,
      },
    );
  }

  const access = await validateGuestOrderCredential(id, token);
  if (!access.valid || !access.expiresAt || typeof token !== "string") {
    return NextResponse.json(
      { error: "Order access was not found." },
      { status: 404 },
    );
  }

  const response = redirect
    ? NextResponse.redirect(new URL(`/order/${id}`, request.url), 303)
    : new NextResponse(null, { status: 204 });
  response.cookies.set(guestOrderCookieName(id), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: guestOrderCookiePath(id),
    expires: new Date(access.expiresAt),
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

/** Backward-compatible bearer URL exchange for already-issued guest links. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return exchangeCredential(
    request,
    id,
    request.nextUrl.searchParams.get("token"),
    true,
  );
}

/**
 * New checkout flow: exchange the bearer from a bounded JSON body, set the
 * path-scoped HttpOnly cookie, then let the client navigate to the clean URL.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const body = await readBoundedJson<unknown>(request, { maxBytes: 256 });
  if (!body.ok) {
    return NextResponse.json(
      { error: body.error },
      { status: body.status },
    );
  }
  const token =
    body.value && typeof body.value === "object"
      ? (body.value as Record<string, unknown>).token
      : null;
  const { id } = await context.params;
  return exchangeCredential(request, id, token, false);
}
