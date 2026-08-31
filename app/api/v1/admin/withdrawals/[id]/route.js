import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function PATCH(request, { params }) {
  const { session, allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { id } = params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { status } = body;
  if (!["approved", "paid", "rejected"].includes(status)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } },
      { status: 400 }
    );
  }

  const dataToUpdate = {
    status,
    processedBy: session.user.id,
    processedAt: new Date(),
  };

  const updated = await db.withdrawalRequest.update({
    where: { id },
    data: dataToUpdate,
    select: { id: true, status: true },
  });

  return NextResponse.json({ success: true, data: updated });
}