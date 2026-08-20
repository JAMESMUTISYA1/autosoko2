import {
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  getProductBySlug,
  formatPrice,
  getStoreById,
  getProductsByStore,
  getBoughtTogether,
} from "@/data/sampleData";
import ProductGallery from "@/components/ProductGallery";
import ProductActions from "@/components/ProductActions";
import SellerCard from "@/components/SellerCard";
import FittingGuide from "@/components/FittingGuide";
import BoughtTogether from "@/components/BoughtTogether";
import ProductRow from "@/components/ProductRow";

const COMPATIBLE_VEHICLES = [
  "Toyota Corolla (E170) — 2016–2019, 1.8L Automatic",
  "Toyota Corolla (E170) — 2016–2019, 1.8L Manual",
  "Toyota Auris — 2015–2018, 1.8L Hybrid",
];

const SPECS = [
  { label: "Brand", value: "Bosch" },
  { label: "OEM Number", value: "04465-02350" },
  { label: "Part Number", value: "BP-COR-1819" },
  { label: "Condition", value: "New" },
  { label: "Warranty", value: "6 months" },
  { label: "Material", value: "Ceramic composite" },
];

export default async function ProductPage({ params }) {
  const product = await getProductBySlug(params.slug);

  // Mock-sourced products carry a matching mock storeId and can use the
  // synchronous mock-array helpers (store detail, other listings from
  // that store). Real API-sourced products don't have a mock storeId —
  // adaptApiProduct() in sampleData.js already put everything the
  // seller card needs directly on the product itself, so build a
  // minimal store object from that instead of trying to look one up.
  const store = product.storeId
    ? getStoreById(product.storeId)
    : {
        id: product.storeSlug,
        slug: product.storeSlug,
        name: product.sellerName,
        verified: product.sellerVerified,
        sellerType: product.sellerType,
        location: product.location,
        rating: product.rating,
        ratingCount: 0,
      };

  // "More from this store" / "bought together" rely on the mock
  // catalog's cross-referencing (boughtTogetherIds, shared storeId) —
  // there's no real backend for either yet (no cross-sell table, and
  // the public product API doesn't expose a business id to query more
  // listings by). Real API-sourced products simply don't show these
  // sections rather than showing broken/empty ones — see BACKEND.md.
  const storeItemsSameCategory = product.storeId
    ? getProductsByStore(product.storeId, product.slug).filter((p) => p.categoryId === product.categoryId)
    : [];
  const storeOtherItems = product.storeId ? getProductsByStore(product.storeId, product.slug) : [];
  const boughtTogetherItems = product.storeId ? getBoughtTogether(product) : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted mb-6 flex items-center gap-1.5 flex-wrap">
        <a href="/" className="hover:text-fg">Home</a>
        <span>/</span>
        <a href="/search" className="hover:text-fg">Brakes</a>
        <span>/</span>
        <span className="text-fg">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
        {/* Left: gallery + details */}
        <div>
          <ProductGallery images={product.images} name={product.name} />

          {/* Description */}
          <div className="mt-10">
            <h2 className="font-display text-lg mb-3">Description</h2>
            <p className="text-sm text-muted leading-relaxed">
              Premium ceramic composite brake pads engineered for consistent
              stopping power and reduced brake dust. Direct fit replacement —
              no modification required. Sourced from an authorized Bosch
              distributor with full traceability.
            </p>
          </div>

          {/* Specs */}
          <div className="mt-8">
            <h2 className="font-display text-lg mb-3">Specifications</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {SPECS.map((s) => (
                <div key={s.label} className="flex justify-between border-b border-line py-2">
                  <dt className="text-muted">{s.label}</dt>
                  <dd className="text-fg font-mono">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Compatible vehicles */}
          <div className="mt-8">
            <h2 className="font-display text-lg mb-3">Compatible Vehicles</h2>
            <ul className="space-y-2">
              {COMPATIBLE_VEHICLES.map((v) => (
                <li
                  key={v}
                  className="flex items-center gap-2 text-sm bg-card border border-line rounded-sm px-3 py-2.5"
                >
                  <ShieldCheck size={14} className="text-fg shrink-0" />
                  {v}
                </li>
              ))}
            </ul>
          </div>

          {/* Fitting guide + tools needed — omits itself if the product has none */}
          <FittingGuide product={product} />

          {/* Bought together */}
          <BoughtTogether mainProduct={product} items={boughtTogetherItems} />

          {/* From this store — same category */}
          {store && (
            <ProductRow
              title={`More ${product.categoryId ? "Like This" : "Items"} From ${store.name}`}
              viewAllHref={`/store/${store.slug}`}
              products={storeItemsSameCategory}
            />
          )}

          {/* Seller's other items — everything else in their store */}
          {store && (
            <ProductRow
              title={`More From ${store.name}`}
              viewAllHref={`/store/${store.slug}`}
              products={storeOtherItems}
            />
          )}
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
                {product.rating}
              </span>
              {product.unitsSold > 0 && <span>· {product.unitsSold} sold</span>}
            </div>

            <div className="mt-4 parts-tag parts-tag-on-light bg-fg text-bg font-mono text-xl font-semibold">
              {formatPrice(product.priceMinor, product.currency)}
            </div>

            <ProductActions product={product} />
          </div>

          {/* Seller card */}
          {store && <SellerCard product={product} store={store} />}
        </div>
      </div>
    </div>
  );
}
