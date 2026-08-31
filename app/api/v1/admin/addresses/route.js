import { db } from "@/lib/db";

// GET /api/v1/admin/addresses?search=&page=&perPage=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage")) || 20));

    const where = search
      ? {
          OR: [
            { addressLine: { contains: search, mode: "insensitive" } },
            { recipientName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { user: { fullName: { contains: search, mode: "insensitive" } } },
            { town: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    const [addresses, total] = await Promise.all([
      db.address.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
          town: { include: { region: { include: { country: { select: { id: true, name: true } } } } } },
        },
        orderBy: { id: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.address.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: addresses,
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not load addresses." } },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/addresses
// { userId, label?, recipientName?, phone?, addressLine, townId?, isDefault? }
//
// Note: only townId is persisted on Address (per the schema, country/region
// are derived transitively via town -> region -> country). The admin UI's
// country/region selects exist purely to narrow the town dropdown.
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, label, recipientName, phone, addressLine, townId, isDefault } = body;

    if (!userId || !addressLine?.trim()) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "User and address line are required." } },
        { status: 422 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found." } },
        { status: 404 }
      );
    }

    const address = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId,
          label: label?.trim() || null,
          recipientName: recipientName?.trim() || null,
          phone: phone?.trim() || null,
          addressLine: addressLine.trim(),
          townId: townId || null,
          isDefault: Boolean(isDefault),
        },
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
          town: { include: { region: { include: { country: { select: { id: true, name: true } } } } } },
        },
      });
    });

    return Response.json({ success: true, data: address }, { status: 201 });
  } catch (error) {
    console.error("Failed to create address:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not create address." } },
      { status: 500 }
    );
  }
}
