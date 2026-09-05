import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import {
  GRIEVANCE_OFFICER,
  GSTIN,
  LEGAL_ADDRESS,
  LEGAL_ENTITY_NAME,
  SITE_NAME,
  SITE_TAGLINE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/lib/config";

const shopLinks = [
  { href: "/shop/ties", label: "Ties" },
  { href: "/shop/cufflinks", label: "Cufflinks" },
  { href: "/shop/brooches", label: "Brooches" },
  { href: "/shop/pocket-squares", label: "Pocket Squares" },
  { href: "/shop/buttons", label: "Buttons" },
  { href: "/shop/gift-sets", label: "Gift Sets" },
];

const helpLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/guides", label: "Size & Care Guides" },
  { href: "/shipping-returns", label: "Shipping & Returns" },
  { href: "/payments", label: "Payment Methods" },
  { href: "/contact", label: "Contact Us" },
  { href: "/track-order", label: "Track Order" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const socialLinks = [
  { href: "https://instagram.com/fastenoshyama", label: "Instagram", Icon: Instagram },
  { href: "https://facebook.com/fastenoshyama", label: "Facebook", Icon: Facebook },
  { href: "https://x.com/fastenoshyama", label: "X (Twitter)", Icon: Twitter },
  { href: "https://youtube.com/@fastenoshyama", label: "YouTube", Icon: Youtube },
];

export function Footer() {
  return (
    <footer className="bg-block text-block-text">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {/* brand */}
        <div>
          <img
            src="/branding/fasteno-logo.png"
            alt="Fasteno.in"
            className="h-10 w-auto mb-4"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-block-text/65">
            {SITE_TAGLINE} Ties, cufflinks, brooches, pocket squares and
            buttons — curated for the well-finished man.
          </p>
          <p className="mt-4 text-sm text-block-text/65">
            {SUPPORT_EMAIL}
            <br />
            {SUPPORT_PHONE}
          </p>
          <ul className="mt-5 flex items-center gap-4">
            {socialLinks.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-block-text/65 transition-colors hover:text-gold-light"
                >
                  <Icon size={17} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* link columns */}
        {[
          { title: "Shop", links: shopLinks },
          { title: "Help", links: helpLinks },
          { title: "Company", links: companyLinks },
        ].map((col) => (
          <div key={col.title}>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light">
              {col.title}
            </p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-block-text/65 transition-colors hover:text-gold-light"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* legal / compliance — Consumer Protection (E-Commerce) Rules, 2020 */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl space-y-1.5 px-4 py-6 text-[11px] leading-relaxed text-block-text/50 sm:px-6">
          <p>
            Sold by <span className="text-block-text/70">{LEGAL_ENTITY_NAME}</span> ·{" "}
            {LEGAL_ADDRESS}
          </p>
          <p>
            Grievance Officer: {GRIEVANCE_OFFICER.name} ·{" "}
            <a
              href={`mailto:${GRIEVANCE_OFFICER.email}`}
              className="transition-colors hover:text-gold-light"
            >
              {GRIEVANCE_OFFICER.email}
            </a>{" "}
            · {GRIEVANCE_OFFICER.phone}
          </p>
          <p>{GRIEVANCE_OFFICER.sla}</p>
          {GSTIN && <p>GSTIN: {GSTIN}</p>}
          <p>
            See accepted payment methods, charge timing and refund procedure
            on our{" "}
            <Link
              href="/payments"
              className="transition-colors hover:text-gold-light"
            >
              Payment Methods
            </Link>{" "}
            page.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-block-text/55 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="tracking-wide">
            UPI · Cards · Netbanking · Wallets · Cash on Delivery
          </p>
        </div>
      </div>
    </footer>
  );
}
