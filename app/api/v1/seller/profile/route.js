import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { normalizePhone } from "@/lib/phone";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const user = await db.user.findUnique({
    where: { id: guard.sellerId },
    select: { id: true, fullName: true, email: true, phone: true },
  });

  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const { fullName, email, phone } = body;

  const dataToUpdate = {};

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Full name must be at least 2 characters" } },
        { status: 400 }
      );
    }
    dataToUpdate.fullName = fullName.trim();
  }

  if (email !== undefined) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid email format" } },
        { status: 400 }
      );
    }
    const normalizedEmail = email.toLowerCase().trim() || null;
    if (normalizedEmail) {
      const existing = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
      if (existing && existing.id !== guard.sellerId) {
        return NextResponse.json(
          { success: false, error: { code: "ALREADY_EXISTS", message: "Email already in use" } },
          { status: 409 }
        );
      }
    }
    dataToUpdate.email = normalizedEmail;
  }

  if (phone !== undefined) {
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (phone && !normalizedPhone) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid phone number" } },
        { status: 400 }
      );
    }
    if (normalizedPhone) {
      const existing = await db.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true } });
      if (existing && existing.id !== guard.sellerId) {
        return NextResponse.json(
          { success: false, error: { code: "ALREADY_EXISTS", message: "Phone number already in use" } },
          { status: 409 }
        );
      }
    }
    dataToUpdate.phone = normalizedPhone;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id: guard.sellerId },
    data: dataToUpdate,
    select: { id: true, fullName: true, email: true, phone: true },
  });

  return NextResponse.json({ success: true, data: updated });
}