// Buyer / general-platform auth config (edge-safe — no Prisma import).
// This is ONLY for the main site session (buyers, and Agents under /agent).
// Admin and Seller now run on their OWN NextAuth instances with their own
// cookies (see auth.admin.js / auth.seller.js) so a login on one portal can
// never make you appear "logged in" on another.

export const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,

  // Explicit cookie name so it's obvious this is the BUYER session, and so
  // it can never collide with the admin/seller cookies below.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.buyer-session-token"
          : "authjs.buyer-session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    // See the comment in adminAuthConfig.js — every NextAuth instance on
    // the same domain defaults to the same csrf/callback cookie names
    // unless overridden, which causes cross-portal collisions ("Bad
    // request." on sign-in). Each portal needs its own.
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-authjs.buyer-csrf-token"
          : "authjs.buyer-csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.buyer-callback-url"
          : "authjs.buyer-callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthenticated = Boolean(auth?.user);

      // /admin, /agent and /seller are gated in middleware.js against their
      // own dedicated sessions — do NOT re-check them here, or you end up
      // with two different (and easily-inconsistent) sources of truth.
      // This callback only needs to protect plain buyer-only pages.
      if (pathname.startsWith("/account")) {
        return isAuthenticated;
      }
      return true;
    },

    // DB-free session callback so the edge middleware can read role/business.
    async session({ session, token }) {
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.businessId = token.businessId;
      return session;
    },
  },
};