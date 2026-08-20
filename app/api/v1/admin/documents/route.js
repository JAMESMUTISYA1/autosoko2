import { z } from "zod";
import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/admin/documents — admin only (agents don't get this — the
// one deliberate exception to "admin has everything agent has")
export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden();

  const documents = await db.adminDocument.findMany({
    select: {
      id: true, name: true, category: true, url: true, sizeBytes: true, createdAt: true,
      uploader: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: documents.map((d) => ({ ...d, uploadedBy: d.uploader.fullName })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

// POST /api/v1/admin/documents — metadata-only for now. Real file
// upload needs S3/Cloudinary wired up (Document 1's storage layer isn't
// configured in this environment); `url` is a placeholder until then.
export async function POST(request) {
  const { session, allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });

  const document = await db.adminDocument.create({
    data: { ...parsed.data, url: "#", uploadedBy: session.user.id },
    select: { id: true, name: true, category: true },
  });

  return Response.json({ success: true, data: document }, { status: 201 });
}
