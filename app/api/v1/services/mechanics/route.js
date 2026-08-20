import { db } from "@/lib/db";

export async function GET() {
  const mechanics = await db.mechanic.findMany({
    select: {
      id: true, name: true, specialties: true, ratingAvg: true, ratingCount: true,
      verified: true, mobileAvailable: true, town: { select: { name: true } },
    },
  });
  return Response.json({ success: true, data: mechanics });
}
