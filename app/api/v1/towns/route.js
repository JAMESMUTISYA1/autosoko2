import { db } from "@/lib/db";

// GET /api/v1/towns — reference data, cached
export async function GET() {
  const towns = await db.town.findMany({
    select: { id: true, name: true, region: { select: { name: true, country: { select: { name: true } } } } },
  });
  return Response.json(
    { success: true, data: towns.map((t) => ({ id: t.id, name: t.name, country: t.region.country.name })) },
    { headers: { "Cache-Control": "public, s-maxage=86400" } }
  );
}
