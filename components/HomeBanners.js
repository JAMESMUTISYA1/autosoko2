"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  {
    title: "Sell your spare parts — no business license needed",
    body: "Individuals and businesses both sell on AutoSoko. List your first item in minutes.",
    cta: "Start Selling",
    href: "/seller/listings/new",
  },
  {
    title: "Book a mechanic without leaving your house",
    body: "Mobile mechanics, alignment, and full servicing — scheduled around you.",
    cta: "Explore Services",
    href: "/services",
  },
  {
    title: "Free delivery on orders over KES 5,000",
    body: "Courier delivery across Nairobi, Mombasa, and Kampala this month.",
    cta: "Shop Now",
    href: "/search",
  },
];

export default function HomeBanners() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  function go(delta) {
    setIndex((i) => (i + delta + BANNERS.length) % BANNERS.length);
  }

  const banner = BANNERS[index];

  return (
    <div className="relative border border-line rounded-md overflow-hidden bg-card">
      <div className="flex items-center justify-between px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-md">
          <h3 className="font-display text-lg md:text-xl mb-2">{banner.title}</h3>
          <p className="text-sm text-muted mb-4">{banner.body}</p>
          <Link
            href={banner.href}
            className="inline-block bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90 transition-colors"
          >
            {banner.cta}
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-fg transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-fg transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 pb-4">
        {BANNERS.map((b, i) => (
          <button
            key={b.title}
            onClick={() => setIndex(i)}
            aria-label={`Show banner ${i + 1}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-accent" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
