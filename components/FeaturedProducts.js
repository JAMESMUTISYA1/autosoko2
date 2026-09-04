import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

async function getFeaturedProducts() {
  const products = await db.product.findMany({
    where: {
      status: "active",
      deletedAt: null,
      sponsored: true,
    },
    orderBy: { viewCount: "desc" },
    take: 8, // fetch a few extra so we can filter out those without images
    select: {
      id: true,
      name: true,
      slug: true,
      priceMinor: true,
      currency: true,
      stockQuantity: true,
      condition: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
      business: {
        select: {
          name: true,
          verificationStatus: true,
          ratingAvg: true,
          town: { select: { name: true } },
          country: { select: { name: true } },
        },
      },
    },
  });

  // Filter out products without an image and map to the shape ProductCard expects
  return products
    .filter((p) => p.images && p.images.length > 0 && p.images[0].url)
    .map((p) => {
      const imageUrl = p.images[0].url;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceMinor: p.priceMinor,
        currency: p.currency,
        condition: p.condition,
        stockQuantity: p.stockQuantity,
        sponsored: true,
        images: [imageUrl],
        image: imageUrl,
        sellerName: p.business.name,
        sellerVerified: p.business.verificationStatus === "verified",
        rating: p.business.ratingAvg ?? 0,
        location: p.business.town?.name || p.business.country?.name || "Kenya",
        unitsSold: 0,
      };
    });
}

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}