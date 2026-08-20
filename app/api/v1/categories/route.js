import { db } from "@/lib/db";

// GET /api/v1/categories — public, rarely changes
export async function GET() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, iconUrl: true, parentId: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  return Response.json(
    { success: true, data: categories },
    {
      headers: {
        // Reference data that changes rarely — safe to cache at the
        // edge/CDN for a while, with revalidation rather than re-hitting
        // Postgres on every single request for something this static.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
