import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { normalizePhone } from "@/lib/phone";
import { sellerAuthConfig } from "@/Sellerauthconfig";

export const {
  handlers,
  auth: sellerAuth,
  signIn: sellerSignIn,
  signOut: sellerSignOut,
} = NextAuth({
  ...sellerAuthConfig,

  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or phone" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const identifier = credentials?.identifier?.toString().trim();
        const password = credentials?.password?.toString();
        console.log("SELLER AUTH: identifier =", identifier);
        if (!identifier || !password) {
          console.log("SELLER AUTH: missing credentials");
          return null;
        }

        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const [ipLimit, idLimit] = await Promise.all([
          checkRateLimit(`ip:${ip}`, "seller-auth"),
          checkRateLimit(`id:${identifier.toLowerCase()}`, "seller-auth"),
        ]);
        console.log("SELLER AUTH: rate limits", ipLimit, idLimit);
        if (!ipLimit.success || !idLimit.success) {
          console.log("SELLER AUTH: rate limited");
          return null;
        }

        const isEmail = identifier.includes("@");
        const lookupValue = isEmail ? identifier.toLowerCase() : normalizePhone(identifier);
        console.log("SELLER AUTH: lookup =", lookupValue);

        const user = await db.user.findUnique({
          where: isEmail ? { email: lookupValue } : { phone: lookupValue },
        });
        console.log("SELLER AUTH: user =", user?.id, user?.email, user?.phone);

        const valid = user ? await verifyPassword(password, user.passwordHash) : false;
        console.log("SELLER AUTH: password valid =", valid);
        if (!user || !valid) return null;
        if (user.status !== "active") {
          console.log("SELLER AUTH: user not active");
          return null;
        }

        const membership = await db.businessMember.findFirst({
          where: {
            userId: user.id,
            status: "active",
            business: {
              slug: { not: "autosoko-platform" },
              status: "active", // ensure the business itself is active
            },
          },
          select: {
            businessId: true,
            role: { select: { name: true } },
          },
        });
        console.log("SELLER AUTH: membership =", membership);

        if (!membership) {
          console.log("SELLER AUTH: no active membership for non‑platform business");
          return null;
        }

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          businessId: membership.businessId,
          role: membership.role?.name || "Seller",
        };
      },
    }),
  ],

  callbacks: {
    ...sellerAuthConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.businessId = user.businessId;
        token.role = user.role;
      }
      return token;
    },
  },
});