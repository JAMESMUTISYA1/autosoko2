import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getOwnedProduct } from "@/lib/productOwnership";
import { writeAuditLog } from "@/lib/audit";

// POST /api/v1/seller/products/:productId/compatibility
// Body: { vehicleTrimId }  OR  { generationId }
// Optional: { yearStart, yearEnd, notes }
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json(
      { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { vehicleTrimId, generationId, yearStart, yearEnd, notes } = body;

  if (!vehicleTrimId && !generationId) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION",
          message: "Either vehicleTrimId or generationId is required",
        },
      },
      { status: 400 }
    );
  }

  // Determine the list of trims to link
  let trimsToLink = [];

  if (vehicleTrimId) {
    // Single trim
    const trim = await db.vehicleTrim.findUnique({ where: { id: vehicleTrimId } });
    if (!trim) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vehicle trim not found" } },
        { status: 404 }
      );
    }
    trimsToLink = [trim];
  } else {
    // All trims of a generation
    const trims = await db.vehicleTrim.findMany({
      where: { generationId },
      orderBy: { name: "asc" },
    });
    if (trims.length === 0) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "No trims found for that generation" } },
        { status: 404 }
      );
    }
    trimsToLink = trims;
  }

  // Find which of these are already linked to avoid duplicates
  const existingLinks = await db.productVehicleCompatibility.findMany({
    where: {
      productId: params.productId,
      vehicleTrimId: { in: trimsToLink.map((t) => t.id) },
    },
    select: { vehicleTrimId: true },
  });
  const existingTrimIds = new Set(existingLinks.map((l) => l.vehicleTrimId));

  const newTrims = trimsToLink.filter((t) => !existingTrimIds.has(t.id));
  if (newTrims.length === 0) {
    return Response.json(
      { success: false, error: { code: "CONFLICT", message: "Vehicle(s) already linked" } },
      { status: 409 }
    );
  }

  // Create all links in a transaction
  const createdLinks = await db.$transaction(
    newTrims.map((trim) =>
      db.productVehicleCompatibility.create({
        data: {
          productId: params.productId,
          vehicleTrimId: trim.id,
          yearStart: yearStart || null,
          yearEnd: yearEnd || null,
          notes: notes || null,
        },
      })
    )
  );

  // Audit log one entry for the batch (or loop if needed)
  await writeAuditLog({
    actorId: guard.sellerId,
    action: "product_compatibility.added_by_seller",
    entityType: "Product",
    entityId: params.productId,
    after: { links: createdLinks.map((l) => l.vehicleTrimId) },
    request,
  });

  return Response.json({ success: true, data: createdLinks }, { status: 201 });
}