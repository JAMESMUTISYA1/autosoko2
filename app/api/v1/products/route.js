import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasBusinessPermission, unauthorized, forbidden } from "@/lib/auth/rbac";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";

const createProductSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(3).max(200),
  condition: z.enum(["new", "used", "refurbished"]),
  priceMinor: z.number().int().positive(),
  currency: z.string().length(3).default("KES"),
  stockQuantity: z.number().int().min(0).default(0),
  shortDescription: z.string().max(500).optional(),
  brand: z.string().max(100).optional(),
  oemNumber: z.string().max(100).optional(),
  compatibleVehicleTrimIds: z.array(z.string().uuid()).optional().default([]),
});

// GET /api/v1/products?businessId=...&status=...&page=1&perPage=20
// Document 3 §3.4 — business-scoped listing for the seller dashboard.
// Selects only the fields the listing view actually needs; the full
// product (images, compatibility, reviews) is a separate detail fetch.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "businessId is required" } },
      { status: 400 }
    );
  }

  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 20);

  const where = {
    businessId,
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  // Count + page fetched together, not sequentially — halves the
  // round-trip latency for a paginated list versus awaiting each in turn.
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        priceMinor: true,
        currency: true,
        stockQuantity: true,
        status: true,
        condition: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return Response.json({
    success: true,
    data: products,
    meta: { page, perPage, total },
  });
}

// POST /api/v1/products — Document 3 §3.1
export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const identifier = getClientIdentifier(request, session.user.id);
  const { success: withinLimit } = await checkRateLimit(identifier, "default");
  if (!withinLimit) {
    return Response.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", fields } },
      { status: 400 }
    );
  }

  const { businessId, compatibleVehicleTrimIds, ...data } = parsed.data;

  const allowed = await hasBusinessPermission(session.user.id, businessId, "products.create");
  if (!allowed) return forbidden("You don't have permission to add products to this business");

  // Slug uniqueness is scoped per-business (Document 2 §2.3: UNIQUE
  // (business_id, slug)), so a naive slugify can collide across two
  // different sellers without issue — only within the same one.
  const baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let slug = baseSlug;
  let suffix = 1;
  while (await db.product.findUnique({ where: { businessId_slug: { businessId, slug } } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const product = await db.product.create({
    data: {
      ...data,
      businessId,
      slug,
      status: "active",
      compatibility: compatibleVehicleTrimIds.length
        ? { create: compatibleVehicleTrimIds.map((vehicleTrimId) => ({ vehicleTrimId })) }
        : undefined,
    },
    select: { id: true, slug: true, name: true, status: true },
  });

  // Real implementation enqueues a search-reindex job here (BullMQ, per
  // Document 1 §3.2) — deliberately async, not awaited, so product
  // creation never blocks on search indexing being slow.

  return Response.json({ success: true, data: product }, { status: 201 });
}
