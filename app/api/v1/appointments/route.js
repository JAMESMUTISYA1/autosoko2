import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";

const schema = z.object({
  serviceTypeId: z.string().uuid().optional(),
  mechanicId: z.string().uuid().optional(),
  locationType: z.enum(["workshop", "home"]),
  address: z.string().optional(),
  scheduledFor: z.string().datetime(),
  vehicleInfo: z.string().trim().min(2),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  notes: z.string().max(1000).optional(),
});

// POST /api/v1/appointments
export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  const appointment = await db.appointment.create({
    data: { ...parsed.data, scheduledFor: new Date(parsed.data.scheduledFor), userId: session.user.id },
    select: { id: true, scheduledFor: true, status: true },
  });

  return Response.json({ success: true, data: appointment }, { status: 201 });
}
