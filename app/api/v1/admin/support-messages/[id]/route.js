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
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } }, { status: 400 });
  }

  const { status } = body;
  if (status !== "open" && status !== "resolved") {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } }, { status: 400 });
  }

  const dataToUpdate = {
    status,
    ...(status === "resolved"
      ? { resolvedBy: session.user.id, resolvedAt: new Date() }
      : { resolvedBy: null, resolvedAt: null }),
  };

  const updated = await db.supportMessage.update({
    where: { id },
    data: dataToUpdate,
    select: { id: true, status: true, resolvedAt: true },
  });

  return NextResponse.json({ success: true, data: updated });
}