import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

const VALID_STATUSES = new Set(["unverified", "pending", "verified", "rejected"]);

export async function PATCH(request, { params }) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { businessId } = params;
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, verificationStatus: true },
  });
  if (!business) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Business not found" } },
      { status: 404 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { verificationStatus } = body;
  if (!verificationStatus || !VALID_STATUSES.has(verificationStatus)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION", message: "verificationStatus must be one of unverified, pending, verified, rejected" } },
      { status: 400 }
    );
  }

  const updated = await db.business.update({
    where: { id: businessId },
    data: { verificationStatus },
    select: { id: true, verificationStatus: true },
  });

  return NextResponse.json({ success: true, data: updated });
}