import { db } from "@/lib/db";

// Returns every user id considered "internal" to a business — the owner
// plus every business_members row. Used so a buyer's messages can be told
// apart from any team member's reply with a plain `senderId NOT IN [...]`
// filter, instead of joining through roles/membership on every message.
export async function getBusinessMemberIds(businessId) {
  const [business, members] = await Promise.all([
    db.business.findUnique({ where: { id: businessId }, select: { ownerUserId: true } }),
    db.businessMember.findMany({ where: { businessId }, select: { userId: true } }),
  ]);
  const ids = new Set(members.map((m) => m.userId));
  if (business?.ownerUserId) ids.add(business.ownerUserId);
  return [...ids];
}
