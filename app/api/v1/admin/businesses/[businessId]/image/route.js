import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { uploadToCloudinary } from "@/lib/cloudinary";

// POST — multipart/form-data: file=<image>, target="logo" | "banner"
export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const target = formData.get("target");

  if (!(file instanceof File) || !["logo", "banner"].includes(target)) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "file (image) and target ('logo' or 'banner') are required" } },
      { status: 400 }
    );
  }
  if (!file.type?.startsWith("image/")) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "Only image files are allowed" } }, { status: 400 });
  }
  const MAX_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "Image must be under 5MB" } }, { status: 400 });
  }

  const before = await db.business.findUnique({ where: { id: params.businessId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  const result = await uploadToCloudinary(file, `businesses/${target}s`);

  const field = target === "logo" ? "logoUrl" : "bannerUrl";
  const business = await db.business.update({
    where: { id: params.businessId },
    data: { [field]: result.secure_url },
  });

  await writeAuditLog({
    actorId: guard.adminId,
    action: target === "logo" ? "business.logo_updated" : "business.banner_updated",
    entityType: "Business",
    entityId: business.id,
    before: { [field]: before[field] },
    after: { [field]: business[field] },
    request,
  });

  return Response.json({ success: true, data: { [field]: business[field] } });
}