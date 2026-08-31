import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const parentId = searchParams.get("parentId");

  try {
    if (type === "makes") {
      const makes = await db.vehicleMake.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return NextResponse.json({ success: true, data: makes });
    }

    if (type === "models" && parentId) {
      const models = await db.vehicleModel.findMany({
        where: { makeId: parentId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return NextResponse.json({ success: true, data: models });
    }

    if (type === "trims" && parentId) {
      const trims = await db.vehicleTrim.findMany({
        where: { generation: { modelId: parentId } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, yearStart: true, yearEnd: true },
      });
      return NextResponse.json({ success: true, data: trims });
    }

    return NextResponse.json({ success: false, error: { code: "INVALID_TYPE", message: "Invalid type or missing parentId" } }, { status: 400 });
  } catch (error) {
    console.error("Vehicle data error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Could not load vehicle data" } }, { status: 500 });
  }
}