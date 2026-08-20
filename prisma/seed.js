import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { hashPassword } from "../lib/auth/password.js";

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

  const nairobiRegion = await db.region.create({ data: { countryId: kenya.id, name: "Nairobi County" } });
  const nairobiTown = await db.town.create({ data: { regionId: nairobiRegion.id, name: "Nairobi" } });

  // Platform roles — the ones middleware.js checks by name.
  const superAdminRole = await db.role.upsert({
    where: { name_scope: { name: "Super Admin", scope: "platform" } },
    update: {},
    create: { name: "Super Admin", scope: "platform", isSystemRole: true },
  });
  const agentRole = await db.role.upsert({
    where: { name_scope: { name: "Agent", scope: "platform" } },
    update: {},
    create: { name: "Agent", scope: "platform", isSystemRole: true },
  });
  const ownerRole = await db.role.upsert({
    where: { name_scope: { name: "Owner", scope: "business" } },
    update: {},
    create: { name: "Owner", scope: "business", isSystemRole: true },
  });

  // A representative set of permissions — Document 3's endpoints imply
  // the rest; add as each new mutating route gets built.
  const permissionKeys = [
    "products.create",
    "products.update",
    "products.delete",
    "orders.manage",
    "orders.refund",
    "businesses.verify",
    "members.manage",
  ];
  const permissions = {};
  for (const key of permissionKeys) {
    permissions[key] = await db.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }
  // Owner gets every business-scoped permission; platform roles bypass
  // this check entirely (see lib/auth/rbac.js), so they don't need rows here.
  for (const key of ["products.create", "products.update", "products.delete", "orders.manage", "members.manage"]) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permissions[key].id } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permissions[key].id },
    });
  }

  const categories = await Promise.all(
    [
      ["Engine Parts", "engine-parts"],
      ["Brakes", "brakes"],
      ["Suspension", "suspension"],
      ["Electrical", "electrical"],
      ["Lighting", "lighting"],
      ["Filters", "filters"],
      ["Tyres & Rims", "tyres-rims"],
      ["Body Parts", "body-parts"],
      ["Batteries", "batteries"],
      ["Accessories", "accessories"],
      ["Electronics", "electronics"],
    ].map(([name, slug]) =>
      db.category.upsert({ where: { slug }, update: {}, create: { name, slug } })
    )
  );
  const brakesCategory = categories.find((c) => c.slug === "brakes");

  const toyota = await db.vehicleMake.upsert({
    where: { slug: "toyota" },
    update: {},
    create: { name: "Toyota", slug: "toyota" },
  });
  const corollaModel = await db.vehicleModel.create({
    data: { makeId: toyota.id, name: "Corolla", slug: "corolla" },
  });
  const corollaGen = await db.vehicleGeneration.create({
    data: { modelId: corollaModel.id, name: "E170", yearStart: 2016, yearEnd: 2019 },
  });
  const corollaTrim = await db.vehicleTrim.create({
    data: { generationId: corollaGen.id, name: "1.8L Automatic", fuelType: "petrol", transmission: "automatic" },
  });

  console.log("Seeding a demo seller + product...");
  const demoPasswordHash = await hashPassword("DemoPass123");

  const sellerUser = await db.user.upsert({
    where: { phone: "+254712000111" },
    update: {},
    create: {
      fullName: "Grace Muthoni",
      phone: "+254712000111",
      email: "grace.demo@autosoko.africa",
      passwordHash: demoPasswordHash,
      status: "active",
    },
  });

  const demoBusiness = await db.business.upsert({
    where: { slug: "nairobi-auto-spares" },
    update: {},
    create: {
      ownerUserId: sellerUser.id,
      name: "Nairobi Auto Spares",
      slug: "nairobi-auto-spares",
      businessType: "wholesaler",
      countryId: kenya.id,
      regionId: nairobiRegion.id,
      townId: nairobiTown.id,
      verificationStatus: "verified",
      homeCurrency: "KES",
    },
  });

  await db.businessMember.upsert({
    where: { businessId_userId: { businessId: demoBusiness.id, userId: sellerUser.id } },
    update: {},
    create: { businessId: demoBusiness.id, userId: sellerUser.id, roleId: ownerRole.id },
  });

  await db.product.upsert({
    where: { businessId_slug: { businessId: demoBusiness.id, slug: "front-brake-pads-toyota-corolla" } },
    update: {},
    create: {
      businessId: demoBusiness.id,
      categoryId: brakesCategory.id,
      name: "Front Brake Pads — Toyota Corolla (2016–2019)",
      slug: "front-brake-pads-toyota-corolla",
      brand: "Bosch",
      oemNumber: "04465-02730",
      priceMinor: 350000,
      currency: "KES",
      stockQuantity: 40,
      condition: "new",
      status: "active",
      compatibility: { create: [{ vehicleTrimId: corollaTrim.id }] },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
