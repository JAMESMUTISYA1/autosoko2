import { db } from "@/lib/db";

// GET /api/v1/delivery-methods?town=Nairobi
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const townQuery = searchParams.get("town")?.trim();

    const where = {
      active: true,
      ...(townQuery
        ? {
            town: {
              name: {
                contains: townQuery,
                mode: "insensitive",
              },
            },
          }
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
        town: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ town: { name: "asc" } }, { feeMinor: "asc" }],
    });

    return Response.json({
      success: true,
      data: methods.map((m) => ({
        id: m.id,
        method: m.method,
        provider: m.provider,
        etaDays: m.etaDays,
        feeMinor: m.feeMinor,
        active: m.active,
        town: m.town,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch delivery methods:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load delivery methods." } },
      { status: 500 }
    );
  }
}