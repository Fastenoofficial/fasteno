import Script from "next/script";
import { AnalyticsRouteTracker } from "@/lib/analytics-client";

const GA_MEASUREMENT_ID = /^G-[A-Z0-9]{6,20}$/;

/**
 * Privacy-scoped GA4 loader. Collection is opt-in twice: a valid measurement
 * id and an explicit-events-only deployment acknowledgement are both needed.
 * Automatic page views stay disabled and initial document metadata is replaced
 * with an allowlisted/redacted pathname before the Google script loads.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim().toUpperCase();
  const explicitOnly =
    process.env.NEXT_PUBLIC_GA_EXPLICIT_EVENTS_ONLY === "true";
  if (!gaId || !GA_MEASUREMENT_ID.test(gaId) || !explicitOnly) return null;

  return (
    <>
      <Script id="ga4-private-bootstrap" strategy="beforeInteractive">
        {`
          (function () {
            var measurementId = ${JSON.stringify(gaId)};
            var pathname = window.location.pathname;
            var sensitive = /^\\/(?:admin|account|auth|login|signup|register|forgot-password|reset-password|order|invoice|access|track-order|payments)(?:\\/|$)/i.test(pathname);
            var normalized = pathname.length > 1 ? pathname.replace(/\\/+$/, '') : '/';
            var staticRoutes = new Set(['/', '/about', '/cart', '/checkout', '/contact', '/faq', '/guides', '/privacy', '/search', '/shipping-returns', '/shop', '/terms']);
            var safePath = staticRoutes.has(normalized)
              ? normalized
              : /^\\/product\\/[^/]+\\/?$/i.test(pathname)
                ? '/product/:product'
                : /^\\/shop\\/[^/]+\\/?$/i.test(pathname)
                  ? '/shop/:category'
                  : /^\\/guides\\/[^/]+\\/?$/i.test(pathname)
                    ? '/guides/:guide'
                    : '/unknown';

            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
            window.__fastenoGaId = measurementId;
            window.__fastenoGaConfigured = false;
            window.gtag('js', new Date());
            if (!sensitive) {
              window.gtag('config', measurementId, {
                anonymize_ip: true,
                send_page_view: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                page_location: window.location.origin + safePath,
                page_path: safePath,
                page_referrer: '',
                page_title: safePath
              });
              window.__fastenoGaConfigured = true;
            }
          })();
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
      />
      <AnalyticsRouteTracker />
    </>
  );
}
