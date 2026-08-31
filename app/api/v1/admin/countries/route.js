import { db } from "@/lib/db";

// GET /api/v1/admin/countries — reference data for cascading dropdowns.
// Countries are seeded platform-wide reference data (Document 2), not
// something admins CRUD from this UI, so this route is read-only.
export async function GET() {
  try {
    const countries = await db.country.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, isoCode: true, currencyDefault: true, isActiveForLaunch: true },
    });
    return Response.json({ success: true, data: countries });
  } catch (error) {
    console.error("Failed to fetch countries:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load countries." } },
      { status: 500 }
    );
  }
}
