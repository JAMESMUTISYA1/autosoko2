import { db } from "@/lib/db";

// PATCH /api/v1/admin/regions/:id  { name?, countryId? }
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const data = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.countryId !== undefined) data.countryId = body.countryId;

    const region = await db.region.update({
      where: { id },
      data,
      include: { country: { select: { id: true, name: true } } },
    });

    return Response.json({ success: true, data: region });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Region not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to update region:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not update region." } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/regions/:id
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const townCount = await db.town.count({ where: { regionId: id } });
    if (townCount > 0) {
      return Response.json(
        {
          success: false,
          error: { code: "IN_USE", message: `Cannot delete: ${townCount} town(s) still belong to this region.` },
        },
        { status: 409 }
      );
    }

    await db.region.delete({ where: { id } });
    return Response.json({ success: true, data: { id } });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Region not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to delete region:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not delete region." } },
      { status: 500 }
    );
  }
}
