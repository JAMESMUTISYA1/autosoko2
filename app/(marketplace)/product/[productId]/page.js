// PATH: app/product/[productId]/page.js
// RENAME REQUIRED: this replaces app/product/[slug]/page.js. Product.slug
// is only unique WITHIN a business (@@unique([businessId, slug]) in the
// schema) — it can't safely resolve one product platform-wide. Every link
// that used to build `/product/${p.slug}` needs to become
// `/product/${p.id}` instead (ProductCard.js almost certainly does this
// too — it wasn't shared with me, so check it).
//
// Data comes from lib/publicProducts.js directly (server component — no
// HTTP round-trip needed for the page's own render). The same data is
// also exposed over REST for any other consumer at:
//   GET /api/v1/products/:productId
//   GET /api/v1/products/:productId/related?type=store|category

import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { getPublicProductDetail, incrementProductViewCount, getRelatedProducts } from "@/lib/publicProducts";
import ProductGallery from "@/components/ProductGallery";
import ProductActions from "@/components/ProductActions";
import SellerCard from "@/components/SellerCard";
import FittingGuide from "@/components/FittingGuide";
import ProductRow from "@/components/ProductRow";
import ProductSpecs from "@/components/ProductSpecs";
import ProductCompatibility from "@/components/ProductCompatibility";
import ProductReviews from "@/components/ProductReviews";

// Small local helper — removes the page's dependency on the mock
// @/data/sampleData module entirely rather than cherry-picking one
// function out of a file that's otherwise all mock catalog data.
function formatPrice(minor, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((minor || 0) / 100);
}

export default async function ProductPage({ params }) {
  const product = await getPublicProductDetail(params.productId);
  if (!product) notFound();

  await incrementProductViewCount(params.productId);

  const [storeItems, categoryItems] = await Promise.all([
    getRelatedProducts(product, "store"),
    getRelatedProducts(product, "category"),
  ]);

  const images = product.images.length ? product.images.map((img) => img.url) : [];
  const inStock = !product.trackInventory || product.stockQuantity > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb — category slug/name are real now, not a hardcoded "Brakes" */}
      <nav className="text-xs text-muted mb-6 flex items-center gap-1.5 flex-wrap">
        <a href="/" className="hover:text-fg">Home</a>
        <span>/</span>
        <a href={`/category/${product.category.slug}`} className="hover:text-fg">{product.category.name}</a>
        <span>/</span>
        <span className="text-fg">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
        {/* Left: gallery + details */}
        <div>
          <ProductGallery images={images} name={product.name} />

          {/* Description — real longDescription/shortDescription, was a
              hardcoded paragraph before */}
          {(product.longDescription || product.shortDescription) && (
            <div className="mt-10">
              <h2 className="font-display text-lg mb-3">Description</h2>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
                {product.longDescription || product.shortDescription}
              </p>
            </div>
          )}

          <ProductSpecs product={product} />
          <ProductCompatibility compatibility={product.compatibility} />
          <FittingGuide product={product} />

          {/* "Bought Together" intentionally omitted — no real cross-sell
              data source exists in the schema. See BoughtTogether.js's own
              header comment. */}

          <ProductRow
            title="More Like This"
            viewAllHref={`/category/${product.category.slug}`}
            products={categoryItems}
          />
          <ProductRow
            title={`More From ${product.business.name}`}
            viewAllHref={`/store/${product.business.slug}`}
            products={storeItems}
          />

          <ProductReviews ratingAvg={product.ratingAvg} reviewCount={product.reviewCount} reviews={product.reviews} />
        </div>

        {/* Right: purchase panel */}
        <div className="space-y-4">
          <div className="border border-line rounded-md p-5">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-display text-xl leading-snug">{product.name}</h1>
              {product.sponsored && (
                <span className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-sm border border-fg">
                  Sponsored
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Star size={13} className="fill-fg text-fg" />
                {product.ratingAvg.toFixed(1)} ({product.reviewCount})
              </span>
              {product.unitsSold > 0 && <span>· {product.unitsSold} sold</span>}
            </div>

            <div className="mt-4 parts-tag parts-tag-on-light bg-fg text-bg font-mono text-xl font-semibold">
              {formatPrice(product.priceMinor, product.currency)}
            </div>
            {!inStock && <p className="text-sm text-red-600 font-semibold mt-2">Out of stock</p>}

            <ProductActions product={product} inStock={inStock} />
          </div>

          {/* Seller card — now built directly from product.business, no
              separate store lookup or mock-vs-real branching needed */}
          <SellerCard product={product} store={product.business} />
        </div>
      </div>
    </div>
  );
}