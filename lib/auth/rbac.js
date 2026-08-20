import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Returns the current session, or null. Use at the top of every API
 * route that requires authentication — middleware.js only gates page
 * navigation, not API calls made directly (curl, another service, a
 * client bug bypassing the UI), so routes must check for themselves too.
 */
export async function getSession() {
  return auth();
}

/**
 * Checks whether a user holds a specific permission (e.g.
 * "products.create") on a specific business — the actual enforcement
 * behind Document 2's roles/permissions/role_permissions tables.
 * Platform-scope roles (admin/agent) implicitly pass every business-
 * scoped check, matching the "admin can do what an agent can" design.
 */
export async function hasBusinessPermission(userId, businessId, permissionKey) {
  const platformMembership = await db.businessMember.findFirst({
    where: { userId, role: { scope: "platform" } },
  });
  if (platformMembership) return true;

  const membership = await db.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });
  if (!membership) return false;

  return membership.role.rolePermissions.some((rp) => rp.permission.key === permissionKey);
}

/**
 * Standard shape for auth/permission failures, matching the ActionResult
 * pattern from Document 4's coding standards and Document 3's error
 * envelope — every route returns this same shape on failure so clients
 * don't need per-route special-casing.
 */
export function unauthorized(message = "Authentication required") {
  return Response.json(
    { success: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  );
}

export function forbidden(message = "You don't have permission to do this") {
  return Response.json(
    { success: false, error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}

const ADMIN_ROLES = new Set(["Super Admin", "Ops Admin"]);
const AGENT_ROLES = new Set(["Agent", ...ADMIN_ROLES]);

/**
 * Returns the session's platform role info. Used by every admin/agent
 * API route — middleware only gates page navigation, these routes must
 * check independently since they can be called directly (curl, a bug
 * in the client, another service).
 */
export async function requirePlatformRole(minLevel = "agent") {
  const session = await getSession();
  if (!session?.user) return { session: null, role: null, allowed: false };

  const role = session.user.role;
  const allowed = minLevel === "admin" ? ADMIN_ROLES.has(role) : AGENT_ROLES.has(role);
  return { session, role, allowed };
}
