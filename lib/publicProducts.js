// PATH: lib/publicProducts.js

import { db } from "@/lib/db";

// Mirrors the same nested shape used on the seller side (see
// app/api/v1/seller/products/[productId]/route.js) so a compatibility link
// displays identically whether it's Model-, Generation-, or Trim-level,
// wherever it's rendered.
const PUBLIC_PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: "asc" } },
  variants: true,
  documents: true,
  category: { select: { id: true, name: true, slug: true } },
  compatibility: {
    include: {
      vehicleTrim: {
        select: {
          id: true,
          name: true,
          engineDisplacementCc: true,
          fuelType: true,
          transmission: true,
          driveType: true,
          bodyType: true,
          generation: {
            select: {
              id: true,
              name: true,
              yearStart: true,
              yearEnd: true,
              model: {
                select: {
                  id: true,
                  name: true,
                  make: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  // Same field list as the existing public GET /api/v1/businesses/:slug —
  // no taxPin, registrationNumber, or verificationDocuments here either.
  business: {
    select: {
      id: true,
      slug: true,
      name: true,
      businessType: true,
      logoUrl: true,
      verificationStatus: true,
      ratingAvg: true,
      ratingCount: true,
      whatsapp: true,
      phone: true,
      town: { select: { name: true } },
      country: { select: { name: true } },
    },
  },
};

export async function getPublicProductDetail(productId) {
  const product = await db.product.findFirst({
    where: {
      id: productId,
      deletedAt: null,
      status: "active",
      business: { deletedAt: null, status: "active" },
    },
    include: PUBLIC_PRODUCT_INCLUDE,
  });
  if (!product) return null;

  const [ratingAgg, reviews, unitsSoldAgg] = await Promise.all([
    db.productReview.aggregate({
      where: { productId, status: "published" },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.productReview.findMany({
      where: { productId, status: "published" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        isVerifiedPurchase: true,
        createdAt: true,
        buyer: { select: { fullName: true } },
      },
    }),
    db.orderItem.aggregate({
      where: { productId, order: { status: { notIn: ["cancelled", "refunded"] } } },
      _sum: { quantity: true },
    }),
  ]);

  return {
    ...product,
    ratingAvg: ratingAgg._avg.rating || 0,
    reviewCount: ratingAgg._count.rating,
    reviews,
    unitsSold: unitsSoldAgg._sum.quantity || 0,
  };
}

export async function incrementProductViewCount(productId) {
  try {
    await db.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } });
  } catch {
    // Non-critical — a failed view-count bump should never break the page.
  }
}

export async function getRelatedProducts(product, type, limit = 12) {
  const where =
    type === "store"
      ? { businessId: product.businessId, id: { not: product.id }, deletedAt: null, status: "active" }
      : { categoryId: product.categoryId, id: { not: product.id }, deletedAt: null, status: "active" };

  const products = await db.product.findMany({
    where,
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      business: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    images: p.images.map((img) => img.url),
    priceMinor: p.priceMinor,
    currency: p.currency,
    condition: p.condition,
    sponsored: p.sponsored,
    businessSlug: p.business.slug,
    businessName: p.business.name,
  }));
}