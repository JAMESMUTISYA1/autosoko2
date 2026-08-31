import { db } from "@/lib/db";

// GET /api/v1/admin/towns?regionId=&countryId=&search=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get("regionId");
    const countryId = searchParams.get("countryId");
    const search = searchParams.get("search")?.trim();

    const where = {
      ...(regionId ? { regionId } : {}),
      ...(countryId ? { region: { countryId } } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };

    const towns = await db.town.findMany({
      where,
      include: { region: { include: { country: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, data: towns });
  } catch (error) {
    console.error("Failed to fetch towns:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load towns." } },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/towns  { name, regionId }
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, regionId } = body;

    if (!name?.trim() || !regionId) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and region are required." } },
        { status: 422 }
      );
    }

    const region = await db.region.findUnique({ where: { id: regionId } });
    if (!region) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Region not found." } },
        { status: 404 }
      );
    }

    const town = await db.town.create({
      data: { name: name.trim(), regionId },
      include: { region: { include: { country: { select: { id: true, name: true } } } } },
    });

    return Response.json({ success: true, data: town }, { status: 201 });
  } catch (error) {
    console.error("Failed to create town:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not create town." } },
      { status: 500 }
    );
  }
}
