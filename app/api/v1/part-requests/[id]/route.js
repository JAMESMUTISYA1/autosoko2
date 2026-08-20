import { db } from "@/lib/db";

// GET /api/v1/part-requests/:id
export async function GET(request, { params }) {
  const partRequest = await db.partRequest.findUnique({
    where: { id: params.id },
    select: {
      id: true, partName: true, description: true, partNumber: true, imageUrl: true,
      vehicleInfo: true, status: true, createdAt: true,
      user: { select: { fullName: true } },
      town: { select: { name: true } },
      responses: {
        select: {
          id: true, message: true, priceMinor: true, createdAt: true,
          business: { select: { name: true, slug: true, verificationStatus: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!partRequest) {
    return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  return Response.json({ success: true, data: { ...partRequest, requesterName: partRequest.user.fullName } });
}
