import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { TrustBar } from "@/components/layout/TrustBar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { OrgJsonLd } from "@/components/seo/OrgJsonLd";
import { Analytics } from "@/lib/analytics";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/config";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Premium Ties, Cufflinks & Accessories`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${SITE_TAGLINE} Premium men's formal accessories — silk ties, cufflinks, brooches, pocket squares and buttons. Free shipping over ₹1,499 across India.`,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <OrgJsonLd />
        <Analytics />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-block focus:px-4 focus:py-2 focus:text-sm focus:text-block-text"
        >
          Skip to content
        </a>
        <CartProvider>
          <AnnouncementBar />
          <TrustBar />
          <Navbar />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
        </CartProvider>
      </body>
    </html>
  );
}
