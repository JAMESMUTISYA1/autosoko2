import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET(request) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "all"; // open | resolved | all
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(50, Number(searchParams.get("perPage")) || 20);

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "open") where.status = "open";
  if (status === "resolved") where.status = "resolved";

  const [total, messages] = await Promise.all([
    db.supportMessage.count({ where }),
    db.supportMessage.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        resolver: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: messages,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}