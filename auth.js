import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";
import { authConfig } from "@/auth.config";

// Buyer / platform auth — mounted at /api/auth/[...nextauth].
// Extends auth.config.js (the edge-safe subset middleware uses) with the
// DB-touching pieces. This session is intentionally separate from the
// Admin and Seller sessions (see auth.admin.js / auth.seller.js) — logging
// in here never grants admin or seller access, and vice versa.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

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

        // Rate limit BEFORE touching the database. Two buckets: per-IP
        // (stops one attacker hammering many accounts) and per-identifier
        // (stops distributed attempts against one account from many IPs) —
        // same pattern as the admin/seller portals.
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const [ipLimit, idLimit] = await Promise.all([
          checkRateLimit(`ip:${ip}`, "buyer-auth"),
          checkRateLimit(`id:${identifier.toLowerCase()}`, "buyer-auth"),
        ]);
        if (!ipLimit.success || !idLimit.success) return null;

        const isEmail = identifier.includes("@");
        const lookupValue = isEmail ? identifier.toLowerCase() : normalizePhone(identifier);

        const user = await db.user.findUnique({
          where: isEmail ? { email: lookupValue } : { phone: lookupValue },
        });

        // Always run verifyPassword, even with no user, so response timing
        // doesn't reveal whether the identifier exists.
        const valid = await verifyPassword(password, user?.passwordHash);
        if (!user || !valid) return null;
        if (user.status !== "active") return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
        };
      },
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;

        const userRoles = await db.userRole.findMany({
          where: { userId: user.id, role: { scope: "platform" } },
          select: { role: { select: { name: true } } },
        });
        const platformRoleNames = userRoles.map((ur) => ur.role.name);
        const primaryRole = platformRoleNames.length > 0 ? platformRoleNames[0] : "buyer";

        token.role = primaryRole;

        const ownBusiness = await db.businessMember.findFirst({
          where: { userId: user.id, business: { slug: { not: "autosoko-platform" } } },
          select: { businessId: true },
        });
        token.businessId = ownBusiness?.businessId || null;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.businessId = token.businessId;
      return session;
    },
  },
});