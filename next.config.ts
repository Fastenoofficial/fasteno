import type { NextConfig } from "next";
import { allowedImageOrigins } from "./lib/image-hosts";

// ── Content-Security-Policy ────────────────────────────────────────────
// Allow-list of the third parties the app genuinely loads, plus its own
// assets. Anything not listed is blocked by `default-src 'self'`.
//   • Razorpay Checkout   — script + iframe + XHR to *.razorpay.com
//   • Supabase            — REST + realtime websocket to the project host
//   • Google Analytics    — only when NEXT_PUBLIC_GA_ID is set
// `script-src 'unsafe-inline'` remains necessary for Next App Router's inline
// hydration bootstrap and the current inline GA/admin script elements. A
// nonce would require complete middleware-to-layout wiring, so this policy
// does not attempt a partial rollout. `script-src-attr 'none'` independently
// blocks HTML event attributes; React listeners and Razorpay callbacks do not
// use them. `unsafe-eval` is development-only for React Fast Refresh.
// `style-src 'unsafe-inline'` remains necessary for existing inline styles.
const isDev = process.env.NODE_ENV !== "production";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseHosts = supabaseUrl
  ? `${supabaseUrl} ${supabaseUrl.replace(/^https:/i, "wss:")}`
  : "https://*.supabase.co wss://*.supabase.co";

// Exact HTTPS image origins come from deployment configuration; unlike the
// previous `https:` source, this does not authorize every HTTPS host. When GA
// is enabled, its already-trusted exact origins remain available for image-
// beacon fallbacks as well as the connect/script transports allowed below.
const analyticsImageOrigins = process.env.NEXT_PUBLIC_GA_ID?.trim()
  ? [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
    ]
  : [];
const imageSources = [
  "'self'",
  "data:",
  "blob:",
  ...allowedImageOrigins(),
  ...analyticsImageOrigins,
].join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imageSources}`,
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
  // Keep standalone/serverless traces rooted in the deployment checkout. This
  // avoids monorepo-style parent lockfile inference when the release is built
  // from an isolated Git worktree and keeps Vercel route manifests complete.
  outputFileTracingRoot: process.cwd(),
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
