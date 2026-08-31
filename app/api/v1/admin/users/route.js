import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";

export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ success: true, data: [] });
  }

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { fullName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, email: true, phone: true, status: true },
    take: 10,
  });

  return Response.json({ success: true, data: users });
}