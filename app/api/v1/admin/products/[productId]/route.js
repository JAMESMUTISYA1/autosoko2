import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET(request, { params }) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { productId } = params;
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      priceMinor: true,
      currency: true,
      stockQuantity: true,
      condition: true,
      status: true,
      trackInventory: true,
      brand: true,
      manufacturer: true,
      oemNumber: true,
      partNumber: true,
      sku: true,
      barcode: true,
      wholesalePriceMinor: true,
      moq: true,
      warrantyMonths: true,
      weightGrams: true,
      lengthMm: true,
      widthMm: true,
      heightMm: true,
      youtubeUrl: true,
      fittingInstructions: true,
      toolsNeeded: true,
      sponsored: true,
      shortDescription: true,
      longDescription: true,
      category: { select: { id: true, name: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, sortOrder: true, isPrimary: true },
      },
      compatibility: {
        select: {
          vehicleTrimId: true,
          yearStart: true,
          yearEnd: true,
          notes: true,
          vehicleTrim: {
            select: {
              id: true,
              name: true,
              generation: { select: { name: true, model: { select: { name: true, make: { select: { name: true } } } } } }
            }
          }
        }
      },
    },
  });

  if (!product || product.deletedAt) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  // Map compatibility to easier shape
  const compatibility = product.compatibility.map(c => ({
    trimId: c.vehicleTrimId,
    trimName: c.vehicleTrim.name,
    yearStart: c.yearStart,
    yearEnd: c.yearEnd,
    notes: c.notes,
    make: c.vehicleTrim.generation.model.make.name,
    model: c.vehicleTrim.generation.model.name,
    generation: c.vehicleTrim.generation.name,
  }));

  return NextResponse.json({ success: true, data: { ...product, compatibility } });
}

export async function PATCH(request, { params }) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { productId } = params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } }, { status: 400 });
  }

  const allowedFields = [
    "name", "priceMinor", "stockQuantity", "condition", "status",
    "trackInventory", "brand", "manufacturer", "oemNumber", "partNumber",
    "sku", "barcode", "wholesalePriceMinor", "moq", "warrantyMonths",
    "weightGrams", "lengthMm", "widthMm", "heightMm", "youtubeUrl",
    "fittingInstructions", "toolsNeeded", "sponsored", "shortDescription",
    "longDescription",
  ];

  const dataToUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) dataToUpdate[field] = body[field];
  }
  // Numeric conversions
  if (dataToUpdate.priceMinor !== undefined) dataToUpdate.priceMinor = Math.round(dataToUpdate.priceMinor);
  if (dataToUpdate.wholesalePriceMinor !== undefined) dataToUpdate.wholesalePriceMinor = Math.round(dataToUpdate.wholesalePriceMinor);
  if (dataToUpdate.stockQuantity !== undefined) dataToUpdate.stockQuantity = Number(dataToUpdate.stockQuantity);
  if (dataToUpdate.moq !== undefined) dataToUpdate.moq = Number(dataToUpdate.moq);
  if (dataToUpdate.warrantyMonths !== undefined) dataToUpdate.warrantyMonths = Number(dataToUpdate.warrantyMonths);
  if (dataToUpdate.weightGrams !== undefined) dataToUpdate.weightGrams = Number(dataToUpdate.weightGrams);
  if (dataToUpdate.lengthMm !== undefined) dataToUpdate.lengthMm = Number(dataToUpdate.lengthMm);
  if (dataToUpdate.widthMm !== undefined) dataToUpdate.widthMm = Number(dataToUpdate.widthMm);
  if (dataToUpdate.heightMm !== undefined) dataToUpdate.heightMm = Number(dataToUpdate.heightMm);

  // Update compatibility if provided
  const { compatibleTrims } = body;
  if (compatibleTrims && Array.isArray(compatibleTrims)) {
    await db.$transaction([
      db.productVehicleCompatibility.deleteMany({ where: { productId } }),
      db.productVehicleCompatibility.createMany({
        data: compatibleTrims.map(trimId => ({ productId, vehicleTrimId: trimId })),
      }),
    ]);
  }

  const updated = await db.product.update({
    where: { id: productId },
    data: dataToUpdate,
    select: { id: true, name: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request, { params }) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { productId } = params;
  await db.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), status: "archived" },
  });

  return NextResponse.json({ success: true });
}