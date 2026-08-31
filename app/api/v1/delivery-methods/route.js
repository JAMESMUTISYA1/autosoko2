import { db } from "@/lib/db";

// GET /api/v1/delivery-methods?townId=<id>  (preferred, exact)
// GET /api/v1/delivery-methods?town=Nakuru  (fallback, name search)
//
// A town can carry any number of delivery methods with any provider name —
// "Delivery by 2NK Sacco" in Nakuru, "Delivery by Kinatwa Sacco" in
// Machakos, a courier, a boda-boda option, etc. Nothing here assumes a
// fixed list; `method` and `provider` are just the free-text values an
// admin entered against a town.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const townId = searchParams.get("townId");
    const townQuery = searchParams.get("town")?.trim();

    const where = {
      active: true,
      ...(townId
        ? { townId }
        : townQuery
        ? { town: { name: { contains: townQuery, mode: "insensitive" } } }
        : {}),
    };

    const methods = await db.deliveryMethod.findMany({
      where,
      select: {
        id: true,
        method: true,
        provider: true,
        etaDays: true,
        feeMinor: true,
        active: true,
        town: { select: { id: true, name: true } },
      },
      orderBy: [{ town: { name: "asc" } }, { feeMinor: "asc" }],
    });

    return Response.json({ success: true, data: methods });
  } catch (error) {
    console.error("Failed to fetch delivery methods:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load delivery methods." } },
      { status: 500 }
    );
  }
}
