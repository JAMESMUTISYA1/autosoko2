import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { listMakes, createMake } from "@/lib/vehicleData";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const makes = await listMakes({ search: searchParams.get("search")?.trim() });
  return Response.json({ success: true, data: makes });
}

// Sellers can only ADD — there is no PATCH/DELETE handler in this file, so
// those methods 405 automatically rather than needing an explicit check.
// Reusing createMake() means the exact same dedup/validation rules the
// admin portal uses apply here too.
export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await createMake(body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.sellerId, action: "vehicle_make.created_by_seller", entityType: "VehicleMake",
    entityId: result.data.id, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data }, { status: 201 });
}