import { notFound } from "next/navigation";
import { stores as mockStores, getProductsByStore as getMockProductsByStore } from "@/data/sampleData";
import StoreCard from "@/components/StoreCard";
import ProductCard from "@/components/ProductCard";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function loadStore(slug) {
  try {
    const businessRes = await fetch(`${getBaseUrl()}/api/v1/businesses/${slug}`, { cache: "no-store" });
    if (!businessRes.ok) throw new Error(`businesses/${slug} returned ${businessRes.status}`);
    const businessJson = await businessRes.json();
    if (!businessJson.success) throw new Error(businessJson.error?.message);
    const business = businessJson.data;

    const productsRes = await fetch(
      `${getBaseUrl()}/api/v1/products?businessId=${business.id}&status=active`,
      { cache: "no-store" }
    );
    const productsJson = await productsRes.json();
    const products = productsJson.success ? productsJson.data : [];

    return {
      store: {
        slug: business.slug,
        name: business.name,
        sellerType: business.businessType === "individual_seller" ? "individual" : "business",
        verified: business.verificationStatus === "verified",
        rating: business.ratingAvg,
        ratingCount: business.ratingCount,
        location: business.town?.name || business.country?.name || "",
        memberSince: new Date(business.createdAt).getFullYear().toString(),
      },
      // Real API products are shaped differently (nested images[0].url,
      // no denormalized sellerName/location) — map onto what ProductCard
      // expects, same adapter pattern as sampleData.js's adaptApiProduct.
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceMinor: p.priceMinor,
        currency: p.currency,
        condition: p.condition,
        images: p.images?.length ? [p.images[0].url] : [],
        sellerName: business.name,
        sellerVerified: business.verificationStatus === "verified",
        location: business.town?.name || "",
        rating: business.ratingAvg,
        unitsSold: 0,
        sponsored: false,
      })),
      fromApi: true,
    };
  } catch (err) {
    console.warn(`[store/${slug}] Falling back to mock data:`, err.message);
    const store = mockStores.find((s) => s.slug === slug);
    if (!store) return null;
    return { store, products: getMockProductsByStore(store.id), fromApi: false };
  }
}

export default async function StorePage({ params }) {
  const result = await loadStore(params.slug);
  if (!result) return notFound();
  const { store, products } = result;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="border border-line rounded-md p-5 mb-8">
        <StoreCard store={store} />
        <p className="text-xs text-muted mt-3">
          {store.location} · Member since {store.memberSince} · {products.length} active listings
        </p>
      </div>

      <h2 className="font-display text-lg mb-4">All Listings</h2>
      {products.length === 0 ? (
        <p className="text-sm text-muted">This store has no active listings right now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
