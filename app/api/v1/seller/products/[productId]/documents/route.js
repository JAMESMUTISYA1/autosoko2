import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getOwnedProduct } from "@/lib/productOwnership";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED_TYPES = new Set(["installation_guide", "spec_sheet"]);
const MAX_BYTES = 10 * 1024 * 1024;

// POST — multipart/form-data: file=<pdf/doc>, type="installation_guide" | "spec_sheet", title=<optional>
export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type");
  const title = formData.get("title");

  if (!(file instanceof File)) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "file is required" } }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(type)) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "type must be installation_guide or spec_sheet" } },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "File must be under 10MB" } }, { status: 400 });
  }

  // resource_type "raw" — this endpoint is for PDFs/docs, not photos.
  const result = await uploadToCloudinary(file, `products/${params.productId}/documents`, "raw");

  const document = await db.productDocument.create({
    data: { productId: params.productId, url: result.secure_url, type, title: title || null },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_document.added_by_seller", entityType: "Product",
    entityId: params.productId, after: document, request,
  });

  return Response.json({ success: true, data: document }, { status: 201 });
}