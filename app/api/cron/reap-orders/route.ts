import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { reapStalePendingRazorpayOrders } from "@/lib/orders";

export const runtime = "nodejs";
// Never cache — this mutates order state.
export const dynamic = "force-dynamic";

/** GET /api/cron/reap-orders — scheduled cleanup of abandoned online
 *  checkouts (Razorpay widget dismissed, never paid). Flips orders left
 *  pending past the cutoff to failed and returns their reserved stock.
 *
 *  Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the
 *  CRON_SECRET env var is set. We REQUIRE that secret so the endpoint can't
 *  be triggered by the public — a missing secret fails closed.
 *  Schedule is defined in vercel.json. */
export async function GET(request: Request) {
  if (isDemoMode) {
    return NextResponse.json({ ok: true, skipped: "demo-mode" });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("cron/reap-orders: CRON_SECRET not set — refusing to run.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { reaped } = await reapStalePendingRazorpayOrders();
  return NextResponse.json({ ok: true, reaped });
}
