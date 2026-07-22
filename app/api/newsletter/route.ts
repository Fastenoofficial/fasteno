import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── Tiny in-memory rate limiter: 5 requests / minute / IP ─────────────
// (Per-instance only — fine for a light abuse guard on a newsletter form.)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    // Opportunistic cleanup so the map can't grow unbounded.
    if (hits.size > 1000) {
      for (const [key, value] of hits) {
        if (now - value.windowStart >= WINDOW_MS) hits.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/** POST /api/newsletter — body: { email: string }
 *  Demo mode: nothing is stored; returns success with demo:true.
 *  Live mode: inserts into newsletter_subscribers (public-insert RLS);
 *  a unique violation is reported as success ("already subscribed"). */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts — please try again in a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof (body as Record<string, unknown>)?.email === "string"
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
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

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
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
