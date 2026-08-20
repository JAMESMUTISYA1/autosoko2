import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { hashPassword } from "../lib/auth/password.js";
import { categories as mockCategories, stores as mockStores, featuredProducts as mockProducts } from "../data/sampleData.js";

// Deliberately imports the frontend's own mock data as the seed source,
// rather than duplicating it here — this is what guarantees the seeded
// database and the (still-separate, Fuse-based) search index describe
// the same catalog. See BACKEND.md's note on this: search stays a
// derived index built from data/sampleData.js's static arrays, not a
// live DB query, matching Document 1 §3.2's architecture — but that
// means the two only stay consistent if both are seeded from the same
// source, which is exactly what this script does.

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding reference data...");

  const kenya = await db.country.upsert({
    where: { isoCode: "KE" },
    update: {},
    create: { name: "Kenya", isoCode: "KE", currencyDefault: "KES", phonePrefix: "+254", isActiveForLaunch: true },
  });
  const uganda = await db.country.upsert({
    where: { isoCode: "UG" },
    update: {},
    create: { name: "Uganda", isoCode: "UG", currencyDefault: "UGX", phonePrefix: "+256", isActiveForLaunch: true },
  });

  const nairobiRegion = await db.region.upsert({
    where: { id: "seed-nairobi-region" },
    update: {},
    create: { id: "seed-nairobi-region", countryId: kenya.id, name: "Nairobi County" },
  });
  const nairobiTown = await db.town.upsert({
    where: { id: "seed-nairobi-town" },
    update: {},
    create: { id: "seed-nairobi-town", regionId: nairobiRegion.id, name: "Nairobi" },
  });

  // Platform roles — the ones middleware.js/auth.config.js check by name.
  await db.role.upsert({
    where: { name_scope: { name: "Super Admin", scope: "platform" } },
    update: {},
    create: { name: "Super Admin", scope: "platform", isSystemRole: true },
  });
  await db.role.upsert({
    where: { name_scope: { name: "Agent", scope: "platform" } },
    update: {},
    create: { name: "Agent", scope: "platform", isSystemRole: true },
  });
  const ownerRole = await db.role.upsert({
    where: { name_scope: { name: "Owner", scope: "business" } },
    update: {},
    create: { name: "Owner", scope: "business", isSystemRole: true },
  });

  const permissionKeys = [
    "products.create", "products.update", "products.delete",
    "orders.manage", "orders.refund", "businesses.verify", "members.manage",
  ];
  const permissions = {};
  for (const key of permissionKeys) {
    permissions[key] = await db.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const key of ["products.create", "products.update", "products.delete", "orders.manage", "members.manage"]) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permissions[key].id } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permissions[key].id },
    });
  }

  console.log(`Seeding ${mockCategories.length} categories...`);
  const categoryIdMap = {}; // mock id (e.g. "cat-brakes") -> real Prisma id
  for (const cat of mockCategories) {
    const record = await db.category.upsert({
      where: { slug: cat.id.replace(/^cat-/, "") },
      update: {},
      create: { name: cat.name, slug: cat.id.replace(/^cat-/, ""), iconUrl: null },
    });
    categoryIdMap[cat.id] = record.id;
  }

  console.log(`Seeding ${mockStores.length} stores as businesses...`);
  const demoPasswordHash = await hashPassword("DemoPass123");
  const storeIdMap = {}; // mock id (e.g. "store-1") -> real Prisma business id

  for (const store of mockStores) {
    const user = await db.user.upsert({
      where: { phone: `+2547${store.id.padStart(9, "0")}` },
      update: {},
      create: {
        fullName: store.name,
        phone: `+2547${store.id.padStart(9, "0")}`,
        email: `${store.slug}@autosoko.africa`,
        passwordHash: demoPasswordHash,
        status: "active",
      },
    });

    const business = await db.business.upsert({
      where: { slug: store.slug },
      update: {},
      create: {
        ownerUserId: user.id,
        name: store.name,
        slug: store.slug,
        businessType: store.sellerType === "individual" ? "individual_seller" : "dealer",
        countryId: kenya.id,
        regionId: nairobiRegion.id,
        townId: nairobiTown.id,
        verificationStatus: store.verified ? "verified" : "pending",
        ratingAvg: store.rating,
        ratingCount: store.ratingCount,
        homeCurrency: "KES",
      },
    });

    await db.businessMember.upsert({
      where: { businessId_userId: { businessId: business.id, userId: user.id } },
      update: {},
      create: { businessId: business.id, userId: user.id, roleId: ownerRole.id },
    });

    storeIdMap[store.id] = business.id;
  }

  console.log(`Seeding ${mockProducts.length} products...`);
  for (const p of mockProducts) {
    const businessId = storeIdMap[p.storeId];
    const categoryId = categoryIdMap[p.categoryId];
    if (!businessId || !categoryId) {
      console.warn(`Skipping ${p.slug} — missing store or category mapping`);
      continue;
    }

    await db.product.upsert({
      where: { businessId_slug: { businessId, slug: p.slug } },
      update: {},
      create: {
        businessId,
        categoryId,
        name: p.name,
        slug: p.slug,
        brand: p.brand || null,
        oemNumber: p.oemNumber && p.oemNumber !== "N/A" ? p.oemNumber : null,
        partNumber: p.partNumber || null,
        sku: p.sku || null,
        shortDescription: p.description || null,
        priceMinor: p.priceMinor,
        currency: p.currency,
        stockQuantity: 40,
        condition: p.condition,
        status: "active",
        sponsored: Boolean(p.sponsored),
        youtubeUrl: p.youtubeUrl || null,
        fittingInstructions: p.fittingInstructions || null,
        toolsNeeded: p.toolsNeeded?.length ? p.toolsNeeded : undefined,
        images: {
          create: (p.images || []).map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 })),
        },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
