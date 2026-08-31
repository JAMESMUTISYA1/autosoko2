import { db } from "@/lib/db";

// GET /api/v1/admin/delivery-methods?townId=&active=&search=&page=&perPage=
//
// A town can have any number of delivery methods (Nakuru might have
// "Delivery by 2NK Sacco" AND "Delivery by Boda", Machakos might have
// "Delivery by Kinatwa Sacco"). `method` and `provider` are plain strings
// on the DeliveryMethod row scoped to a townId — there's no fixed list to
// keep in sync anywhere.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const townId = searchParams.get("townId");
    const activeParam = searchParams.get("active");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage")) || 20));

    const where = {
      ...(townId ? { townId } : {}),
      ...(activeParam === "true" ? { active: true } : {}),
      ...(activeParam === "false" ? { active: false } : {}),
      ...(search
        ? {
            OR: [
              { method: { contains: search, mode: "insensitive" } },
              { provider: { contains: search, mode: "insensitive" } },
              { town: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [methods, total] = await Promise.all([
      db.deliveryMethod.findMany({
        where,
        include: {
          town: { include: { region: { select: { name: true } } } },
          adder: { select: { id: true, fullName: true } },
        },
        orderBy: [{ town: { name: "asc" } }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.deliveryMethod.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: methods,
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  } catch (error) {
    console.error("Failed to fetch delivery methods:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load delivery methods." } },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/delivery-methods
// { townId, method, provider, etaDays, feeMinor, active? }
export async function POST(request) {
  try {
    const body = await request.json();
    const { townId, method, provider, etaDays, feeMinor, active } = body;

    if (
      !townId ||
      !method?.trim() ||
      !provider?.trim() ||
      etaDays === undefined ||
      etaDays === null ||
      etaDays === "" ||
      feeMinor === undefined ||
      feeMinor === null ||
      feeMinor === ""
    ) {
      return Response.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Town, method name, provider, ETA and fee are required." },
        },
        { status: 422 }
      );
    }

    const town = await db.town.findUnique({ where: { id: townId } });
    if (!town) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Town not found." } },
        { status: 404 }
      );
    }

    const delivery = await db.deliveryMethod.create({
      data: {
        townId,
        method: method.trim(),
        provider: provider.trim(),
        etaDays: Number(etaDays),
        feeMinor: Number(feeMinor),
        active: active === undefined ? true : Boolean(active),
        addedBy: null, // TODO: stamp with the signed-in admin once auth is wired back in
      },
      include: {
        town: { include: { region: { select: { name: true } } } },
        adder: { select: { id: true, fullName: true } },
      },
    });

    return Response.json({ success: true, data: delivery }, { status: 201 });
  } catch (error) {
    console.error("Failed to create delivery method:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not create delivery method." } },
      { status: 500 }
    );
  }
}
