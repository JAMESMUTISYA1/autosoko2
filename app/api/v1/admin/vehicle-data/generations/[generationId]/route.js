import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { updateGeneration, deleteGeneration } from "@/lib/vehicleData";

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await updateGeneration(params.generationId, body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_generation.updated", entityType: "VehicleGeneration",
    entityId: params.generationId, before: result.before, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data });
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const result = await deleteGeneration(params.generationId);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_generation.deleted", entityType: "VehicleGeneration",
    entityId: params.generationId, before: result.data, request,
  });

  return Response.json({ success: true });
}