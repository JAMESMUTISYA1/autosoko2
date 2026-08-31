import { db } from "@/lib/db";

// GET /api/v1/towns — reference data, cached
// Optional filters let storefront cascading dropdowns (checkout, address
// picker) narrow the list without a separate admin-only endpoint:
//   ?countryId=<id>   towns whose region belongs to this country
//   ?regionId=<id>    towns that belong to this region
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const countryId = searchParams.get("countryId");
  const regionId = searchParams.get("regionId");

  const where = {
    ...(regionId ? { regionId } : {}),
    ...(countryId ? { region: { countryId } } : {}),
  };

  const towns = await db.town.findMany({
    where,
    select: {
      id: true,
      name: true,
      region: { select: { id: true, name: true, country: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(
    {
      success: true,
      data: towns.map((t) => ({
        id: t.id,
        name: t.name,
        regionId: t.region.id,
        region: t.region.name,
        countryId: t.region.country.id,
        country: t.region.country.name,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=86400" } }
  );
}
