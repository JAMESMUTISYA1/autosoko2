import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { updateModel, deleteModel } from "@/lib/vehicleData";

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await updateModel(params.modelId, body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_model.updated", entityType: "VehicleModel",
    entityId: params.modelId, before: result.before, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const result = await deleteModel(params.modelId);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_model.deleted", entityType: "VehicleModel",
    entityId: params.modelId, before: result.data, request,
  });

  return Response.json({ success: true });
}