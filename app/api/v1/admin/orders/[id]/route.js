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

  const allowedFields = ["status", "notes", "paymentVerified", "deliveredConfirmedBy", "deliveredConfirmedAt"];
  const dataToUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) dataToUpdate[field] = body[field];
  }

  if (body.status) {
    // Record status change in history
    await db.orderStatusHistory.create({
      data: {
        orderId: id,
        status: body.status,
        changedBy: session.user.id,
        note: body.notes || "",
      },
    });
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await db.order.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  return NextResponse.json({ success: true });
}