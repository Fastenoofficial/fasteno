import { NextResponse } from "next/server";
import { isDemoMode, isShiprocketConfigured } from "@/lib/config";

export const runtime = "nodejs";
// Never cache — this mutates order state.
export const dynamic = "force-dynamic";
// Polling several shipments sequentially can outlast the default budget.
export const maxDuration = 60;

/** GET /api/cron/sync-shipments — polls Shiprocket for every live shipment
 *  and advances order status (shipped → delivered), stamping delivered_at
 *  and sending the "delivered" email once.
 *
 *  Auth mirrors /api/cron/reap-orders exactly: Vercel Cron sends
 *  `Authorization: Bearer $CRON_SECRET`, and a missing secret fails closed
 *  (503) rather than leaving the endpoint publicly triggerable.
 *  Schedule lives in vercel.json. */
export async function GET(request: Request) {
  if (isDemoMode) {
    return NextResponse.json({ ok: true, skipped: "demo-mode" });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("cron/sync-shipments: CRON_SECRET not set — refusing to run.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Without credentials this is a no-op rather than an error: the store runs
  // fine on manual courier entry, and the cron shouldn't alarm on every run.
  if (!isShiprocketConfigured) {
    return NextResponse.json({ ok: true, skipped: "shiprocket-not-configured" });
  }

  const { syncAllActiveShipments } = await import("@/lib/shipping-sync");
  const result = await syncAllActiveShipments();
  return NextResponse.json({ ok: true, ...result });
}
