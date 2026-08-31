import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";
import { adminAuthConfig } from "@/Adminauthconfig";

const ADMIN_ROLES = new Set(["Super Admin", "Ops Admin"]);

// Admin auth — mounted at /api/admin-auth/[...nextauth]. Kept in its own
// file/route/cookie so it can be hosted behind an internal path, VPN, or
// extra WAF rule later without touching the buyer/seller auth at all.
export const {
  handlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  ...adminAuthConfig,

  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or phone" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const identifier = credentials?.identifier?.toString().trim();
        const password = credentials?.password?.toString();
        if (!identifier || !password) return null;

        const isEmail = identifier.includes("@");
        const lookupValue = isEmail ? identifier.toLowerCase() : normalizePhone(identifier);

        // Two rate-limit buckets: per-IP (stop a single attacker hammering
        // many accounts) and per-identifier (stop distributed attempts
        // against one admin account). Both are separate buckets from the
        // buyer/seller limiter so a buyer login storm can't lock admins out.
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const [ipLimit, idLimit] = await Promise.all([
          checkRateLimit(`ip:${ip}`, "admin-auth"),
          checkRateLimit(`id:${lookupValue}`, "admin-auth"),
        ]);
        if (!ipLimit.success || !idLimit.success) return null;

        const user = await db.user.findUnique({
          where: isEmail ? { email: lookupValue } : { phone: lookupValue },
        });
        const valid = await verifyPassword(password, user?.passwordHash);
        if (!user || !valid) return null;
        if (user.status !== "active") return null;

        const roles = await db.userRole.findMany({
          where: { userId: user.id, role: { scope: "platform" } },
          select: { role: { select: { name: true } } },
        });
        const roleNames = roles.map((r) => r.role.name);
        const adminRole = roleNames.find((r) => ADMIN_ROLES.has(r));

        // Enforce the role check HERE, before any session/cookie is ever
        // created — a non-admin never receives an admin session, even
        // momentarily. (The previous implementation signed them in first
        // and signed them back out client-side, which is racy and briefly
        // issues a valid admin-portal cookie to a non-admin.)
        if (!adminRole) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: adminRole,
        };
      },
    }),
  ],

  callbacks: {
    ...adminAuthConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
});