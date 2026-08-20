import { Suspense } from "react";
import { Search, MessageCircle, Truck, ShieldCheck } from "lucide-react";
import HomeBanners from "@/components/HomeBanners";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";
import CategorySkeleton from "@/components/skeletons/CategorySkeleton";
import { db } from "@/lib/db";
import { vehicleMakes } from "@/data/sampleData";

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
      sponsored: true, // or any criteria for "featured"
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
      // Add icon if you store lucide icon names in DB
      // icon: true,
    },
  });

  return <CategoryGrid categories={categories} />;
}

export default function HomePage() {
  return (
    <div>
      {/* Hero Section — static, renders immediately */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.06),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-24 h-24 md:w-40 md:h-40 bg-accent opacity-90" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 md:pt-10 md:pb-12">
          <div className="max-w-2xl">
            <span className="inline-block font-mono text-xs tracking-wider text-accent bg-accent/10 border border-accent/30 px-3 py-1 rounded-full">
              1M+ PARTS · 250,000+ SELLERS · 6 COUNTRIES
            </span>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-gray-900 mt-4 leading-[1.15]">
              Find the right part.
              <br className="hidden sm:block" />
              Every time.
            </h1>

            <p className="text-gray-600 mt-3 text-base md:text-lg leading-relaxed max-w-xl">
              AutoSoko connects you to verified spare parts sellers across
              East Africa — from genuine OEM to trusted used parts, matched
              to your exact vehicle.
            </p>

            <div className="mt-5">
              <a
                href="/search"
                className="inline-block bg-[#F68B1E] text-gray-900 font-semibold px-8 py-3 rounded-md hover:bg-[#e07e17] transition-colors shadow-sm"
              >
                Get Started
              </a>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 md:hidden">
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

      {/* Promo banners */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 md:pt-6">
        <HomeBanners />
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

      {/* Shop by vehicle make — static for now */}
      <section className="bg-gray-50 border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <h2 className="font-display text-2xl text-gray-900 mb-4">Shop by Vehicle Make</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {vehicleMakes.map((make) => (
              <a
                key={make}
                href={`/search?make=${make}`}
                className="flex items-center justify-center text-center border border-line rounded-md py-3 sm:py-4 px-3 text-gray-900 font-medium text-sm hover:border-accent hover:bg-white transition-colors"
              >
                {make}
              </a>
            ))}
          </div>
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