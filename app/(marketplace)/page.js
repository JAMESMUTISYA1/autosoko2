export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { Search, MessageCircle, Truck, ShieldCheck } from "lucide-react";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";
import CategorySkeleton from "@/components/skeletons/CategorySkeleton";
import { db } from "@/lib/db";

// How-it-works steps (static)
const STEPS = [
  {
    number: "1",
    icon: Search,
    title: "Search or select your vehicle",
    body: "Find parts by name, OEM number, VIN — or tell us your car and we'll show what fits.",
  },
  {
    number: "2",
    icon: MessageCircle,
    title: "Message the seller or order directly",
    body: "Ask questions, negotiate on bulk orders, or check out instantly for fixed-price listings.",
  },
  {
    number: "3",
    icon: Truck,
    title: "Get it delivered or pick it up",
    body: "Courier delivery, cross-border shipping, or collect directly from the seller's shop.",
  },
];

// Async component to fetch featured products from the database
async function FeaturedProducts() {
  const products = await db.product.findMany({
    where: {
      status: "active",
      deletedAt: null,
      sponsored: true,
    },
    orderBy: { viewCount: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      slug: true,
      priceMinor: true,
      currency: true,
      stockQuantity: true,
      condition: true,
      brand: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
      business: {
        select: {
          name: true,
          slug: true,
          verificationStatus: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
    },
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

// Async component to fetch categories from the database
async function CategoriesSection() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      iconUrl: true,
    },
  });

  return <CategoryGrid categories={categories} />;
}

// Async component to fetch vehicle makes from the database. Ordered by how
// many models each make has (most to least) rather than alphabetically —
// the makes with real catalog depth are what's actually useful to surface
// on the homepage, and this needs no extra "popularity" column on
// VehicleMake to get there. Only makes with a logo are shown — this is a
// branding strip, and a make with no logoUrl would render as a bare text
// pill next to logo'd ones, which looks unfinished rather than
// intentional.
async function VehicleMakesSection() {
  const makes = await db.vehicleMake.findMany({
    where: { logoUrl: { not: null } },
    orderBy: { models: { _count: "desc" } },
    take: 10,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  });

  if (makes.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {makes.map((make) => (
        <a
          key={make.id}
          href={`/search?make=${make.slug}`}
          className="flex flex-col items-center justify-center gap-2 text-center border border-line rounded-md py-4 sm:py-5 px-3 text-gray-900 font-medium text-sm hover:border-accent hover:bg-white transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={make.logoUrl} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
          {make.name}
        </a>
      ))}
    </div>
  );
}

function VehicleMakeSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-20 sm:h-24 rounded-md border border-line bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero Section — fixed height, image fully visible with contain */}
      <section className="relative overflow-hidden min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px] flex items-center bg-white">
        {/* Background image: contain to show entire image, centered horizontally */}
        <div
          className="absolute inset-0 bg-no-repeat bg-center"
          style={{
            backgroundImage: "url('/herobg.png')",
            backgroundSize: "contain",
            backgroundPosition: "70% center",
          }}
        >
          {/* White overlay (covers the entire container) */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent to-[70%]" />
        </div>

        {/* Accent square */}
        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-accent opacity-90 z-10" />

        {/* Content — vertically centered */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <div className="max-w-2xl">
            <span className="inline-block font-mono text-xs tracking-wider text-accent bg-accent/10 border border-accent/30 px-3 py-1 rounded-full">
              1M+ PARTS
            </span>

            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-gray-900 mt-3 leading-[1.15]">
              Find the right part.
              <br className="hidden sm:block" />
              Every time.
            </h1>

            <p className="text-gray-800 mt-2 text-sm md:text-base leading-relaxed max-w-xl">
              AutoSoko connects you to verified spare parts sellers across
              East Africa — from genuine OEM to trusted used parts, matched
              to your exact vehicle.
            </p>

            <div className="mt-4">
              <a
                href="/search"
                className="inline-block bg-[#F68B1E] text-gray-900 font-semibold px-6 py-2.5 rounded-md hover:bg-[#e07e17] transition-colors shadow-sm text-sm md:text-base"
              >
                Get Started
              </a>
            </div>

            {/* Mobile trust badges */}
            <div className="flex flex-wrap gap-2 mt-3 md:hidden">
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                <ShieldCheck size={12} className="text-accent" /> Verified sellers
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                <Truck size={12} className="text-accent" /> Local pickup
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                <MessageCircle size={12} className="text-accent" /> Buyer protection
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured products — Suspense with skeleton fallback */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl text-gray-900">Trending Near You</h2>
          <a href="/search" className="text-sm text-accent hover:opacity-80 transition-colors">
            View all →
          </a>
        </div>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <FeaturedProducts />
        </Suspense>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 md:py-3 flex flex-wrap items-center justify-center gap-x-6 md:gap-x-10 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-accent" />
            Verified seller badges on every trusted shop
          </span>
          <span>Buyer protection on all card &amp; wallet payments</span>
          <span>Local pickup available in every major city</span>
        </div>
      </section>

      {/* Categories — Suspense with skeleton fallback */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl text-gray-900">Shop by Category</h2>
          <a href="/search" className="text-sm text-accent hover:opacity-80 transition-colors">
            View all →
          </a>
        </div>
        <Suspense
          fallback={
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <CategorySkeleton key={i} />
              ))}
            </div>
          }
        >
          <CategoriesSection />
        </Suspense>
      </section>

      {/* Shop by vehicle make — now DB-backed, same Suspense pattern as
          the two sections above (was a hardcoded `vehicleMakes` mock array
          from @/data/sampleData before) */}
      <section className="bg-gray-50 border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <h2 className="font-display text-2xl text-gray-900 mb-4">Shop by Vehicle Make</h2>
          <Suspense fallback={<VehicleMakeSkeleton />}>
            <VehicleMakesSection />
          </Suspense>
        </div>
      </section>

      {/* How it works — static */}
      <section className="bg-invert text-invert-fg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <h2 className="font-display text-2xl mb-4 md:mb-6">How AutoSoko Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[#F68B1E] text-sm">
                      {step.number.padStart(2, "0")}
                    </span>
                    <Icon size={18} className="text-[#F68B1E]" />
                  </div>
                  <h3 className="font-display text-base mb-1">{step.title}</h3>
                  <p className="text-invert-muted text-sm leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sell CTA — static */}
      <section className="bg-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h2 className="font-display text-2xl md:text-3xl text-white">
              Have parts to sell?
            </h2>
            <p className="text-white/80 mt-1 max-w-lg">
              Reach mechanics, garages, and drivers across six countries.
              List your inventory and start receiving orders this week.
            </p>
          </div>
          <a
            href="/seller/listings/new"
            className="shrink-0 bg-invert text-invert-fg font-semibold px-6 py-3 rounded-sm hover:bg-invert-soft transition-colors"
          >
            Start Selling on AutoSoko
          </a>
        </div>
      </section>
    </div>
  );
}