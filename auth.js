import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { authConfig } from "@/auth.config";

// Full config — used by the actual /api/auth/[...nextauth] route handler
// and anywhere server-side code needs `auth()`. Extends auth.config.js
// (the edge-safe subset middleware uses) with the DB-touching pieces:
// real providers and the jwt callback that looks up the user's role.
// This split exists specifically so middleware.js never has to import
// Prisma — see auth.config.js's comment and BACKEND.md for why that
// matters (Edge Runtime compatibility, and avoiding a DB dependency on
// every single matched request).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or phone" }, // matches Document 3 §1.3
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const identifier = credentials?.identifier?.toString().trim();
        const password = credentials?.password?.toString();
        if (!identifier || !password) return null;

        // Rate limit BEFORE touching the database — an unauthenticated
        // brute-force loop shouldn't get to run a query per attempt.
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const { success } = await checkRateLimit(`ip:${ip}`, "auth");
        if (!success) return null; // Auth.js surfaces this as a generic failure — no detail leaked

        const isEmail = identifier.includes("@");
        const user = await db.user.findUnique({
          where: isEmail ? { email: identifier } : { phone: identifier },
        });

        // Constant-shape response whether the account exists or not:
        // verifyPassword safely returns false for a null hash rather
        // than short-circuiting before the compare, which is what
        // actually prevents timing-based account enumeration.
        const valid = await verifyPassword(password, user?.passwordHash);
        if (!user || !valid) return null;

        if (user.status !== "active") return null; // suspended/banned accounts can't sign in

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

    // Runs on sign-in (and token refresh) — NOT on every middleware
    // check, which reads the already-encoded token instead (see
    // auth.config.js). This is the one place the RBAC lookup happens.
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;

        // A platform-scope BusinessMember row (scope: "platform" per
        // Document 2 §4/§5) is what makes someone an agent or admin —
        // ordinary sellers/buyers have none. This one query at sign-in
        // is the entire RBAC lookup; everything after reads the JWT.
        const platformMembership = await db.businessMember.findFirst({
          where: { userId: user.id, role: { scope: "platform" } },
          include: { role: true },
        });
        token.role = platformMembership?.role.name || "buyer";

        // A seller's "primary" business — the first non-platform one
        // they're a member of. Real multi-business support would let
        // the user switch; this is the single-business simplification
        // most of the seller-side UI already assumes.
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
