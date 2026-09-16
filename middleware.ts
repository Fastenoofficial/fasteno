import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readBoundedText } from "@/lib/request-body";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const MAINTENANCE_COOKIE = "__Host-fasteno-maintenance";
const MAINTENANCE_COOKIE_SECONDS = 15 * 60;
const MAINTENANCE_CLOCK_SKEW_SECONDS = 30;
const MAINTENANCE_SECRET_PATTERN = /^[0-9a-f]{64}$/i;
const MAINTENANCE_COOKIE_PATTERN = /^([0-9a-z]{1,10})\.([A-Za-z0-9_-]{43})$/;
const IMAGE_EXTENSION_PATTERN = /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i;

type IncomingHost = { authority: string; hostname: string };

function incomingHost(request: NextRequest): IncomingHost | null {
  const rawHost = request.headers.get("host")?.trim().toLowerCase() ?? "";
  if (
    !rawHost ||
    rawHost.length > 253 ||
    /[\s,/\\]/.test(rawHost)
  ) {
    return null;
  }

  try {
    const parsed = new URL(`https://${rawHost}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return {
      authority: parsed.host,
      hostname: parsed.hostname.toLowerCase(),
    };
  } catch {
    return null;
  }
}

function incomingOrigin(request: NextRequest): string | null {
  const host = incomingHost(request);
  if (!host) return null;
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    .trim()
    .toLowerCase();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : request.nextUrl.protocol;
  return `${protocol}//${host.authority}`;
}

function configuredMaintenanceSecret(): string | null {
  const secret = process.env.MAINTENANCE_BYPASS_SECRET?.trim() ?? "";
  return MAINTENANCE_SECRET_PATTERN.test(secret) ? secret : null;
}

function maintenanceCookieBytes(
  secret: string,
  hostname: string,
  issuedAt: string,
): Buffer {
  return createHmac("sha256", Buffer.from(secret, "hex"))
    .update(
      `fasteno-maintenance-bypass-v1\0${hostname.toLowerCase()}\0${issuedAt}`,
    )
    .digest();
}

function constantTimeHexMatch(candidate: string, expected: string): boolean {
  if (!MAINTENANCE_SECRET_PATTERN.test(candidate)) return false;
  const candidateBytes = Buffer.from(candidate, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return (
    candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes)
  );
}

function hasMaintenanceAccess(
  request: NextRequest,
  secret: string | null,
): boolean {
  if (!secret) return false;
  const supplied = request.cookies.get(MAINTENANCE_COOKIE)?.value ?? "";
  const cookieMatch = MAINTENANCE_COOKIE_PATTERN.exec(supplied);
  const host = incomingHost(request);
  if (!cookieMatch || !host) return false;

  const issuedAt = Number.parseInt(cookieMatch[1], 36);
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + MAINTENANCE_CLOCK_SKEW_SECONDS ||
    now - issuedAt > MAINTENANCE_COOKIE_SECONDS
  ) {
    return false;
  }

  try {
    const suppliedBytes = Buffer.from(cookieMatch[2], "base64url");
    const expectedBytes = maintenanceCookieBytes(
      secret,
      host.hostname,
      cookieMatch[1],
    );
    return (
      suppliedBytes.length === expectedBytes.length &&
      timingSafeEqual(suppliedBytes, expectedBytes)
    );
  } catch {
    return false;
  }
}

function maintenanceResponse(
  canUnlock: boolean,
  options: { denied?: boolean; status?: 403 | 503 } = {},
): NextResponse {
  const status = options.status ?? 503;
  const form = canUnlock
    ? `<form method="post" action="/__maintenance/unlock" autocomplete="off">
        <label for="maintenance-secret">Operator access code</label>
        <div class="access-row">
          <input id="maintenance-secret" name="secret" type="password" autocomplete="off" required maxlength="64" pattern="[0-9A-Fa-f]{64}">
          <button type="submit">Continue</button>
        </div>
        ${options.denied ? '<p class="error" role="alert">Access code not accepted.</p>' : ""}
      </form>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
  <title>Scheduled maintenance | Fasteno.in</title>
  <style>
    :root { color-scheme: dark; font-family: Georgia, "Times New Roman", serif; background: #171512; color: #f8f2e8; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at top, #2d281f, #171512 65%); }
    main { width: min(100%, 560px); border: 1px solid #6e6048; padding: clamp(28px, 7vw, 56px); background: #1f1c17; box-shadow: 0 24px 80px #0008; }
    .eyebrow { margin: 0 0 14px; color: #c5a059; font: 700 12px/1.4 Arial, sans-serif; letter-spacing: .2em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(36px, 8vw, 60px); font-weight: 400; line-height: 1; }
    p { color: #cfc5b5; line-height: 1.7; }
    form { margin-top: 32px; padding-top: 24px; border-top: 1px solid #40382d; }
    label { display: block; margin-bottom: 8px; font: 700 12px/1.4 Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    .access-row { display: flex; gap: 8px; }
    input { min-width: 0; flex: 1; border: 1px solid #6e6048; background: #171512; color: #fff; padding: 12px; }
    button { border: 0; background: #c5a059; color: #171512; padding: 12px 18px; font-weight: 700; cursor: pointer; }
    input:focus-visible, button:focus-visible { outline: 3px solid #f4d391; outline-offset: 2px; }
    .error { color: #ffb4a9; margin-bottom: 0; }
    @media (max-width: 480px) { .access-row { flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Fasteno.in</p>
    <h1>We&rsquo;ll be right back.</h1>
    <p>We&rsquo;re completing scheduled improvements. Please try again in a few minutes.</p>
    ${form}
  </main>
</body>
</html>`;

  const response = new NextResponse(html, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      "Content-Type": "text/html; charset=utf-8",
      Expires: "0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    },
  });
  if (status === 503) response.headers.set("Retry-After", "300");
  return response;
}

function noStoreDuringMaintenance(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  return response;
}

function isStaticFastPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/products/") ||
    IMAGE_EXTENSION_PATTERN.test(pathname)
  );
}

function isWebhookCandidate(request: NextRequest): boolean {
  const signature = request.headers.get("x-razorpay-signature")?.trim() ?? "";
  return (
    process.env.MAINTENANCE_ALLOW_RAZORPAY_WEBHOOK === "1" &&
    request.method === "POST" &&
    request.nextUrl.pathname === "/api/razorpay/webhook" &&
    request.nextUrl.search === "" &&
    Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) &&
    MAINTENANCE_SECRET_PATTERN.test(signature)
  );
}

async function unlockMaintenance(
  request: NextRequest,
  secret: string | null,
): Promise<NextResponse> {
  if (!secret) return maintenanceResponse(false);

  const origin = request.headers.get("origin");
  const expectedOrigin = incomingOrigin(request);
  if (!origin || !expectedOrigin) {
    return maintenanceResponse(true, { denied: true, status: 403 });
  }
  try {
    if (new URL(origin).origin !== expectedOrigin) {
      return maintenanceResponse(true, { denied: true, status: 403 });
    }
  } catch {
    return maintenanceResponse(true, { denied: true, status: 403 });
  }

  const body = await readBoundedText(request, {
    maxBytes: 1024,
    allowedContentTypes: ["application/x-www-form-urlencoded"],
    contentTypeError: "Expected form data.",
  });
  if (!body.ok) {
    return maintenanceResponse(true, { denied: true, status: 403 });
  }

  const candidate = new URLSearchParams(body.value).get("secret")?.trim() ?? "";
  if (!constantTimeHexMatch(candidate, secret)) {
    return maintenanceResponse(true, { denied: true, status: 403 });
  }

  const host = incomingHost(request);
  const originForRedirect = incomingOrigin(request);
  if (!host || !originForRedirect) {
    return maintenanceResponse(true, { denied: true, status: 403 });
  }

  const issuedAt = Math.floor(Date.now() / 1000).toString(36);
  const destination = new URL("/", originForRedirect);
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(
    MAINTENANCE_COOKIE,
    `${issuedAt}.${maintenanceCookieBytes(
      secret,
      host.hostname,
      issuedAt,
    ).toString("base64url")}`,
    {
      httpOnly: true,
      maxAge: MAINTENANCE_COOKIE_SECONDS,
      path: "/",
      sameSite: "strict",
      secure: true,
    },
  );
  return noStoreDuringMaintenance(response);
}

/** Enforces the deployment maintenance boundary, refreshes the Supabase
 * session cookie, and guards /account and /admin. */
export async function middleware(request: NextRequest) {
  const maintenanceActive = process.env.MAINTENANCE_MODE === "1";
  const { pathname } = request.nextUrl;
  const host = incomingHost(request);

  if (maintenanceActive) {
    if (isWebhookCandidate(request)) return NextResponse.next();

    const maintenanceSecret = configuredMaintenanceSecret();
    if (
      request.method === "POST" &&
      pathname === "/__maintenance/unlock" &&
      request.nextUrl.search === ""
    ) {
      return unlockMaintenance(request, maintenanceSecret);
    }

    if (!hasMaintenanceAccess(request, maintenanceSecret)) {
      return maintenanceResponse(Boolean(maintenanceSecret));
    }
  } else if (host?.hostname === "www.fasteno.in") {
    const canonical = request.nextUrl.clone();
    canonical.protocol = "https:";
    canonical.hostname = "fasteno.in";
    canonical.port = "";
    return NextResponse.redirect(canonical, 308);
  }

  if (isStaticFastPath(pathname)) {
    const response = NextResponse.next();
    return maintenanceActive ? noStoreDuringMaintenance(response) : response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const response = NextResponse.next();
    return maintenanceActive ? noStoreDuringMaintenance(response) : response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    pathname.startsWith("/account") || pathname.startsWith("/admin");

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(redirectUrl);
    return maintenanceActive ? noStoreDuringMaintenance(response) : response;
  }

  return maintenanceActive
    ? noStoreDuringMaintenance(supabaseResponse)
    : supabaseResponse;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/:path*"],
};
