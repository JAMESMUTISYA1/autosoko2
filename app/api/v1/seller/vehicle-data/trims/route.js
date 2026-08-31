import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { listTrims, createTrim } from "@/lib/vehicleData";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const trims = await listTrims({ generationId: searchParams.get("generationId") || undefined });
  return Response.json({ success: true, data: trims });
}

export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await createTrim(body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.sellerId, action: "vehicle_trim.created_by_seller", entityType: "VehicleTrim",
    entityId: result.data.id, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data }, { status: 201 });
}