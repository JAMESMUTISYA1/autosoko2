import { db } from "@/lib/db";
import { requirePlatformRole, forbidden } from "@/lib/auth/rbac";

// GET /api/v1/admin/accounts — admin only
export async function GET() {
  const { allowed } = await requirePlatformRole("admin");
  if (!allowed) return forbidden();

  const [sellers, agentMemberships] = await Promise.all([
    db.business.findMany({
      where: { businessType: { not: "distributor" }, deletedAt: null }, // excludes the internal platform anchor business
      select: {
        id: true, name: true, businessType: true, status: true, verificationStatus: true,
        town: { select: { name: true } },
      },
    }),
    db.businessMember.findMany({
      where: { role: { scope: "platform" }, role: { name: "Agent" } },
      select: {
        user: { select: { id: true, fullName: true, status: true } },
      },
    }),
  ]);

  const accounts = [
    ...sellers.map((s) => ({
      id: s.id,
      type: "seller",
      name: s.name,
      subtitle: s.businessType === "individual_seller" ? "Individual Seller" : "Business",
      location: s.town?.name || "",
      verified: s.verificationStatus === "verified",
      suspended: s.status === "suspended",
    })),
    ...agentMemberships.map((m) => ({
      id: m.user.id,
      type: "agent",
      name: m.user.fullName,
      subtitle: "Agent",
      location: "",
      verified: true,
      suspended: m.user.status === "suspended",
    })),
  ];

  return Response.json({ success: true, data: accounts });
}
