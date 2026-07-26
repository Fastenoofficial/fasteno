import { NextResponse } from "next/server";
import { isShiprocketConfigured } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** POST /api/shipping/serviceability — body: { pincode: string, cod?: boolean }
 *
 *  Powers the "delivers to your pincode?" check on the product page.
 *  Public by necessity (shoppers are not signed in), so it is rate-limited
 *  and returns only a yes/no plus an ETA — never courier rate cards, which
 *  would expose our shipping cost structure. */
export async function POST(request: Request) {
  const limited = await rateLimit(`serviceability:${clientIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many checks — please try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limited.retryAfterMs || 60_000) / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>)?.pincode;
  const pincode = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  if (pincode.length !== 6) {
    return NextResponse.json(
      { error: "Please enter a valid 6-digit pincode." },
      { status: 400 },
    );
  }
  const cod = Boolean((body as Record<string, unknown>)?.cod);

  // Not configured → tell the client to hide the widget rather than showing
  // a scary error. The store still sells everywhere; we just can't quote.
  if (!isShiprocketConfigured) {
    return NextResponse.json({ ok: true, unavailable: true });
  }

  const { checkServiceability } = await import("@/lib/shiprocket");
  const result = await checkServiceability(pincode, { cod });

  if (!result.ok) {
    // Never surface raw upstream errors to a shopper.
    return NextResponse.json({ ok: true, unavailable: true });
  }

  return NextResponse.json({
    ok: true,
    serviceable: result.serviceable ?? false,
    etaDays: result.etaDays ?? null,
    codAvailable: result.codAvailable ?? false,
  });
}
