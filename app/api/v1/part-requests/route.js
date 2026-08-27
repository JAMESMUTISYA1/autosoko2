import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, unauthorized } from "@/lib/auth/rbac";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rateLimit";

const createSchema = z.object({
  partName: z.string().trim().min(3).max(200),
  description: z.string().max(1000).optional(),
  partNumber: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  vehicleInfo: z.string().max(200).optional(),
  townId: z.string().uuid().optional(),
});

// GET /api/v1/part-requests — returns only the authenticated user's requests.
// Optional query param: status (open, closed, etc.) to filter by status.
export async function GET(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = {
    userId: session.user.id,
    ...(status ? { status } : {}),
  };

  const requests = await db.partRequest.findMany({
    where,
    select: {
      id: true,
      partName: true,
      description: true,
      partNumber: true,
      imageUrl: true,
      vehicleInfo: true,
      status: true,
      createdAt: true,
      user: { select: { fullName: true } },
      town: { select: { name: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: requests.map((r) => ({
      ...r,
      requesterName: r.user.fullName,
      responseCount: r._count.responses,
    })),
  });
}

// POST /api/v1/part-requests — broadcast a signal
export async function POST(request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { success: withinLimit } = await checkRateLimit(
    getClientIdentifier(request, session.user.id),
    "default"
  );
  if (!withinLimit)
    return Response.json(
      { success: false, error: { code: "RATE_LIMITED" } },
      { status: 429 }
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR" } },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", fields } },
      { status: 400 }
    );
  }

  const partRequest = await db.partRequest.create({
    data: { ...parsed.data, userId: session.user.id },
    select: { id: true, partName: true, createdAt: true },
  });

  return Response.json({ success: true, data: partRequest }, { status: 201 });
}