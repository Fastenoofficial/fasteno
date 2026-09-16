import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { readBoundedJson } from "@/lib/request-body";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST /api/newsletter — body: { email: string }
 *  Demo mode: nothing is stored; returns success with demo:true.
 *  Live mode: inserts into newsletter_subscribers (public-insert RLS);
 *  a unique violation is reported as success ("already subscribed"). */
export async function POST(request: Request) {
  const limited = await rateLimit(
    rateLimitKey("newsletter", clientIp(request)),
    { limit: 5, windowMs: 60_000, mode: "strict" },
  );
  if (!limited.ok) {
    if (limited.outcome === "unavailable") {
      return NextResponse.json(
        { error: RATE_LIMIT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Too many attempts — please try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
        },
      },
    );
  }

  const parsed = await readBoundedJson(request, { maxBytes: 1_024 });
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.status === 400 ? "Invalid request." : parsed.error },
      { status: parsed.status },
    );
  }

  const body = (parsed.value ?? {}) as Record<string, unknown>;
  const email =
    typeof body.email === "string"
      ? body.email.normalize("NFKC").trim().toLowerCase()
      : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  // Demo mode — store nothing, pretend success.
  if (isDemoMode) {
    return NextResponse.json({ ok: true, demo: true });
  }

  // Insert through the service client, not the session client. The table's
  // INSERT policy is service-role only: a public-insert policy would let
  // anyone POST straight to PostgREST and bypass the rate limit and email
  // validation above, filling the table with junk. Routing through here keeps
  // this endpoint the only way in.
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();
  if (!supabase) {
    console.error(
      "newsletter: SUPABASE_SERVICE_ROLE_KEY not set — cannot subscribe.",
    );
    return NextResponse.json(
      { error: "Could not subscribe right now. Please try again later." },
      { status: 500 },
    );
  }
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email, source: "site" });

  if (error) {
    // 23505 = unique_violation → already on the list; treat as success.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    console.error("newsletter: insert failed —", error.message);
    return NextResponse.json(
      { error: "Could not subscribe right now. Please try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
