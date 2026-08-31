import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { listGenerations, createGeneration } from "@/lib/vehicleData";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const generations = await listGenerations({ modelId: searchParams.get("modelId") || undefined });
  return Response.json({ success: true, data: generations });
}

export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await createGeneration(body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.sellerId, action: "vehicle_generation.created_by_seller", entityType: "VehicleGeneration",
    entityId: result.data.id, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data }, { status: 201 });
}