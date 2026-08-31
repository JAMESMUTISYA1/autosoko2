import { db } from "@/lib/db";

// PATCH /api/v1/admin/delivery-methods/:id
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const data = {};
    if (body.townId !== undefined) data.townId = body.townId;
    if (body.method !== undefined) data.method = body.method.trim();
    if (body.provider !== undefined) data.provider = body.provider.trim();
    if (body.etaDays !== undefined) data.etaDays = Number(body.etaDays);
    if (body.feeMinor !== undefined) data.feeMinor = Number(body.feeMinor);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const delivery = await db.deliveryMethod.update({
      where: { id },
      data,
      include: {
        town: { include: { region: { select: { name: true } } } },
        adder: { select: { id: true, fullName: true } },
      },
    });

    return Response.json({ success: true, data: delivery });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Delivery method not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to update delivery method:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not update delivery method." } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/delivery-methods/:id
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await db.deliveryMethod.delete({ where: { id } });
    return Response.json({ success: true, data: { id } });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Delivery method not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to delete delivery method:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not delete delivery method." } },
      { status: 500 }
    );
  }
}
