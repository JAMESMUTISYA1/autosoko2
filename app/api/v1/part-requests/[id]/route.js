import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";

// GET /api/v1/part-requests/:id
export async function GET(request, { params }) {
  const partRequest = await db.partRequest.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,             // added for ownership check on frontend
      partName: true,
      description: true,
      partNumber: true,
      imageUrl: true,
      vehicleInfo: true,
      status: true,
      createdAt: true,
      user: { select: { fullName: true } },
      town: { select: { name: true } },
      responses: {
        select: {
          id: true,
          message: true,
          priceMinor: true,
          createdAt: true,
          business: { select: { name: true, slug: true, verificationStatus: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!partRequest) {
    return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      ...partRequest,
      requesterName: partRequest.user.fullName,
    },
  });
}

// PATCH /api/v1/part-requests/:id — close (or reopen) request
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { id } = params;

  // Find the request and verify ownership
  const existing = await db.partRequest.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });

  if (!existing) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return Response.json({ success: false, error: { code: "FORBIDDEN", message: "You can only close your own requests" } }, { status: 403 });
  }

  // Parse optional status from body (default to closed)
  const body = await request.json().catch(() => ({}));
  const newStatus = body.status === "open" ? "open" : "closed"; // supports reopen if needed

  if (existing.status === newStatus) {
    return Response.json({
      success: false,
      error: { code: "NO_CHANGE", message: `Request is already ${newStatus}` },
    }, { status: 400 });
  }

  const updated = await db.partRequest.update({
    where: { id },
    data: { status: newStatus },
    select: { id: true, status: true },
  });

  return Response.json({ success: true, data: updated });
}