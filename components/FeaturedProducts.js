import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

async function getFeaturedProducts() {
  return db.product.findMany({
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
}

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}