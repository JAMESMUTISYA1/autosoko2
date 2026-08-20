import { db } from "@/lib/db";

// GET /api/v1/vehicles/makes/:makeId/models — Document 3 §4.2
export async function GET(request, { params }) {
  const models = await db.vehicleModel.findMany({
    where: { makeId: params.makeId },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return Response.json(
    { success: true, data: models },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
