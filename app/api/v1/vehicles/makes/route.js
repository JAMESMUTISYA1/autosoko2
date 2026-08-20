import { db } from "@/lib/db";

// GET /api/v1/vehicles/makes — Document 3 §4.1
export async function GET() {
  const makes = await db.vehicleMake.findMany({
    select: { id: true, name: true, slug: true, logoUrl: true },
    orderBy: { name: "asc" },
  });

  return Response.json(
    { success: true, data: makes },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
