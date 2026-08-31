import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { updateMake, deleteMake } from "@/lib/vehicleData";

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await updateMake(params.makeId, body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_make.updated", entityType: "VehicleMake",
    entityId: params.makeId, before: result.before, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const result = await deleteMake(params.makeId);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_make.deleted", entityType: "VehicleMake",
    entityId: params.makeId, before: result.data, request,
  });

  return Response.json({ success: true });
}