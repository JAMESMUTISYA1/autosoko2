import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

// GET /api/v1/locations?type=countries
// GET /api/v1/locations?type=regions&parentId=<countryId>
// GET /api/v1/locations?type=towns&parentId=<regionId>
export async function GET(request) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const parentId = searchParams.get("parentId");

  if (type === "countries") {
    const countries = await db.country.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: countries });
  }

  if (type === "regions") {
    if (!parentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION", message: "parentId is required for regions" } },
        { status: 400 }
      );
    }
    const regions = await db.region.findMany({
      where: { countryId: parentId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: regions });
  }

  if (type === "towns") {
    if (!parentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION", message: "parentId is required for towns" } },
        { status: 400 }
      );
    }
    const towns = await db.town.findMany({
      where: { regionId: parentId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: towns });
  }

  return NextResponse.json(
    { success: false, error: { code: "VALIDATION", message: "type must be countries, regions, or towns" } },
    { status: 400 }
  );
}