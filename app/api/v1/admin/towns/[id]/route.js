import { db } from "@/lib/db";

// PATCH /api/v1/admin/towns/:id  { name?, regionId? }
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const data = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.regionId !== undefined) data.regionId = body.regionId;

    const town = await db.town.update({
      where: { id },
      data,
      include: { region: { include: { country: { select: { id: true, name: true } } } } },
    });

    return Response.json({ success: true, data: town });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Town not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to update town:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not update town." } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/towns/:id
// A town is referenced from several tables (addresses, delivery methods,
// business branches, mechanics, part requests). Deleting it out from under
// those would either fail at the DB or silently orphan data, so we check
// first and return a clear message telling the admin what's still attached.
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const [addressCount, deliveryCount, branchCount, mechanicCount, partRequestCount] = await Promise.all([
      db.address.count({ where: { townId: id } }),
      db.deliveryMethod.count({ where: { townId: id } }),
      db.businessBranch.count({ where: { townId: id } }),
      db.mechanic.count({ where: { townId: id } }),
      db.partRequest.count({ where: { townId: id } }),
    ]);

    const totalDependents = addressCount + deliveryCount + branchCount + mechanicCount + partRequestCount;
    if (totalDependents > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: "IN_USE",
            message: `Cannot delete: this town is referenced by ${deliveryCount} delivery method(s), ${addressCount} address(es), ${branchCount} branch(es), ${mechanicCount} mechanic(s) and ${partRequestCount} part request(s). Reassign or remove those first.`,
          },
        },
        { status: 409 }
      );
    }

    await db.town.delete({ where: { id } });
    return Response.json({ success: true, data: { id } });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Town not found." } },
        { status: 404 }
      );
    }
    console.error("Failed to delete town:", error);
    return Response.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Could not delete town." } },
      { status: 500 }
    );
  }
}
