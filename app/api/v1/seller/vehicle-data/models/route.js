import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { listModels, createModel } from "@/lib/vehicleData";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const models = await listModels({
    makeId: searchParams.get("makeId") || undefined,
    search: searchParams.get("search")?.trim(),
  });
  return Response.json({ success: true, data: models });
}

export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await createModel(body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.sellerId, action: "vehicle_model.created_by_seller", entityType: "VehicleModel",
    entityId: result.data.id, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data }, { status: 201 });
}