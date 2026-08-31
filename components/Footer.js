import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Shop by Category", href: "/search" },
      { label: "Shop by Vehicle", href: "/search?mode=vehicle" },
      { label: "Deals & Clearance", href: "/deals" },
      { label: "Verified Sellers", href: "/search?verified=true" },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Become a Seller", href: "/seller/listings/new" },
      { label: "Seller Dashboard", href: "/seller" },
      { label: "Business Verification", href: "/sell/verification" },
      { label: "Wholesale & B2B", href: "/businesses" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Delivery & Shipping", href: "/help/delivery" },
      { label: "Returns & Refunds", href: "/help/returns" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About AutoSoko", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "Terms & Privacy", href: "/legal" },
    ],
  },
];

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "South Sudan"];
const PAYMENT_METHODS = ["M-Pesa", "Airtel Money", "MTN MoMo", "Tigo Pesa", "Visa", "Mastercard"];

export default function Footer() {
  return (
    <footer className="bg-invert text-invert-fg font-body">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2 md:col-span-1">
          <span className="font-display text-xl">
            AUTO<span className="border-b-2 border-accent">SOKO</span>
          </span>
          <p className="mt-3 text-sm text-invert-muted leading-relaxed">
            East Africa's marketplace for genuine, aftermarket, and used auto
            parts — connecting garages, dealers, and drivers.
          </p>
          <div className="flex gap-3 mt-5">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-invert-soft hover:bg-fg hover:text-bg transition-colors"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs uppercase tracking-wider text-invert-muted mb-4">
              {col.title}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-invert-fg transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Countries served */}
      <div className="border-t border-invert-line">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-invert-muted">
          <span className="uppercase tracking-wider text-invert-muted/70">
            Serving:
          </span>
          {COUNTRIES.map((c) => (
            <span key={c} className="hover:text-invert-fg transition-colors cursor-pointer">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Payments + bottom bar */}
      <div className="border-t border-invert-line">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-invert-muted order-2 md:order-1">
            &copy; {new Date().getFullYear()} AutoSoko. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-2 order-1 md:order-2">
            {PAYMENT_METHODS.map((m) => (
              <span
                key={m}
                className="text-[11px] border border-invert-line rounded-sm px-2 py-1 text-invert-muted"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
