import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getOwnedProduct } from "@/lib/productOwnership";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { writeAuditLog } from "@/lib/audit";

const MAX_IMAGES = 10;
const MAX_BYTES = 5 * 1024 * 1024;

// POST — multipart/form-data: file=<image>, altText=<optional text>
// The first image uploaded for a product automatically becomes primary.
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const altText = formData.get("altText");

  if (!(file instanceof File) || !file.type?.startsWith("image/")) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "A valid image file is required" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "Image must be under 5MB" } }, { status: 400 });
  }

  const existingCount = await db.productImage.count({ where: { productId: params.productId } });
  if (existingCount >= MAX_IMAGES) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: `Maximum ${MAX_IMAGES} images per product` } },
      { status: 400 }
    );
  }

  const result = await uploadToCloudinary(file, `products/${params.productId}`, "image");

  const image = await db.productImage.create({
    data: {
      productId: params.productId,
      url: result.secure_url,
      sortOrder: existingCount,
      isPrimary: existingCount === 0,
      altText: altText || null,
    },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_image.added_by_seller", entityType: "Product",
    entityId: params.productId, after: image, request,
  });

  return Response.json({ success: true, data: image }, { status: 201 });
}