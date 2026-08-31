import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { listMakes, createMake } from "@/lib/vehicleData";

export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const makes = await listMakes({ search: searchParams.get("search")?.trim() });
  return Response.json({ success: true, data: makes });
}

export async function POST(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const result = await createMake(body);
  if (result.error) return result.error;

  await writeAuditLog({
    actorId: guard.adminId, action: "vehicle_make.created", entityType: "VehicleMake",
    entityId: result.data.id, after: result.data, request,
  });

  return Response.json({ success: true, data: result.data }, { status: 201 });
}