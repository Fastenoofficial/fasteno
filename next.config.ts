import type { NextConfig } from "next";

// ── Content-Security-Policy ────────────────────────────────────────────
// Allow-list of the third parties the app genuinely loads, plus its own
// assets. Anything not listed is blocked by `default-src 'self'`.
//   • Razorpay Checkout   — script + iframe + XHR to *.razorpay.com
//   • Supabase            — REST + realtime websocket to the project host
//   • Google Analytics    — only when NEXT_PUBLIC_GA_ID is set
// 'unsafe-inline' on script-src is required by Next.js App Router's inline
// hydration bootstrap (a nonce would need middleware wiring); 'unsafe-eval'
// is added in development only, for React Fast Refresh.
const isDev = process.env.NODE_ENV !== "production";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseHosts = supabaseUrl
  ? `${supabaseUrl} ${supabaseUrl.replace(/^https:/i, "wss:")}`
  : "https://*.supabase.co wss://*.supabase.co";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHosts} https://*.razorpay.com https://www.google-analytics.com https://region1.google-analytics.com`,
  "frame-src 'self' https://checkout.razorpay.com https://*.razorpay.com https://api.razorpay.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  async redirects() {
    // Canonical host: www serves the same deployment on Vercel, so collapse
    // it to the apex for SEO before any page renders.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.fasteno.in" }],
        destination: "https://fasteno.in/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
