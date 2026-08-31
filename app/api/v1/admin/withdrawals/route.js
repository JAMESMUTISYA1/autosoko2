import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformRole, unauthorized } from "@/lib/auth/rbac";

export async function GET(request) {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "all"; // pending | approved | paid | rejected | all
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Number(searchParams.get("perPage")) || 20);

  const where = {};
  if (search) {
    where.OR = [
      { business: { name: { contains: search, mode: "insensitive" } } },
      { destination: { contains: search, mode: "insensitive" } },
      { method: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status !== "all") where.status = status;

  const [total, requests, stats] = await Promise.all([
    db.withdrawalRequest.count({ where }),
    db.withdrawalRequest.findMany({
      where,
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        method: true,
        destination: true,
        status: true,
        createdAt: true,
        processedAt: true,
        business: { select: { id: true, name: true } },
        processor: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.$transaction([
      db.withdrawalRequest.count({ where: { status: "pending" } }),
      db.withdrawalRequest.count({ where: { status: "approved" } }),
      db.withdrawalRequest.count({ where: { status: "paid" } }),
      db.withdrawalRequest.aggregate({
        where: { status: "pending" },
        _sum: { amountMinor: true },
      }),
    ]),
  ]);

  return NextResponse.json({
    success: true,
    data: requests,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    stats: {
      pending: stats[0],
      approved: stats[1],
      paid: stats[2],
      pendingAmountMinor: stats[3]._sum.amountMinor || 0,
    },
  });
}