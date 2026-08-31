import { db } from "@/lib/db";

// GET /api/v1/admin/regions?countryId=&search=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const search = searchParams.get("search")?.trim();

    const where = {
      ...(countryId ? { countryId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };

    const regions = await db.region.findMany({
      where,
      include: { country: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, data: regions });
  } catch (error) {
    console.error("Failed to fetch regions:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load regions." } },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/regions  { name, countryId }
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, countryId } = body;

    if (!name?.trim() || !countryId) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and country are required." } },
        { status: 422 }
      );
    }

    const country = await db.country.findUnique({ where: { id: countryId } });
    if (!country) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Country not found." } },
        { status: 404 }
      );
    }

    const region = await db.region.create({
      data: { name: name.trim(), countryId },
      include: { country: { select: { id: true, name: true } } },
    });

    return Response.json({ success: true, data: region }, { status: 201 });
  } catch (error) {
    console.error("Failed to create region:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not create region." } },
      { status: 500 }
    );
  }
}
