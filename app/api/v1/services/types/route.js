import { db } from "@/lib/db";

export async function GET() {
  const types = await db.serviceType.findMany({
    select: { id: true, name: true, slug: true, description: true, priceFromMinor: true, locationSupport: true },
  });
  return Response.json({ success: true, data: types });
}
