import { db } from "@/lib/db";

// PATCH /api/v1/admin/addresses/:id
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const existing = await db.address.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Address not found." } },
        { status: 404 }
      );
    }

    const data = {};
    if (body.label !== undefined) data.label = body.label?.trim() || null;
    if (body.recipientName !== undefined) data.recipientName = body.recipientName?.trim() || null;
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
    if (body.addressLine !== undefined) data.addressLine = body.addressLine.trim();
    if (body.townId !== undefined) data.townId = body.townId || null;
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);

    const address = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: existing.userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
          town: { include: { region: { include: { country: { select: { id: true, name: true } } } } } },
        },
      });
    });

    return Response.json({ success: true, data: address });
  } catch (error) {
    console.error("Failed to update address:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not update address." } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/addresses/:id
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const orderCount = await db.order.count({ where: { shippingAddressId: id } });
    if (orderCount > 0) {
      return Response.json(
        {
          success: false,
          error: { code: "IN_USE", message: `Cannot delete: used as the shipping address on ${orderCount} order(s).` },
        },
        { status: 409 }
      );
    }

    await db.address.delete({ where: { id } });
    return Response.json({ success: true, data: { id } });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Address not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to delete address:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not delete address." } },
      { status: 500 }
    );
  }
}
