// Seller auth config — its own NextAuth instance/cookie/secret, independent
// of both buyer and admin sessions.

export const sellerAuthConfig = {
  providers: [],
  // REQUIRED — see the comment in adminAuthConfig.js. This instance is
  // mounted at /api/seller-auth, not the library default /api/auth.
  basePath: "/api/seller-auth",
  session: { strategy: "jwt" },
  secret: process.env.SELLER_AUTH_SECRET, // MUST be a distinct secret from AUTH_SECRET / ADMIN_AUTH_SECRET

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-seller-session-token"
          : "seller-session-token",
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
          ? "__Host-seller-csrf-token"
          : "seller-csrf-token",
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
          ? "__Secure-seller-callback-url"
          : "seller-callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  pages: {
    signIn: "/seller/login",
  },

  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub;
      session.user.businessId = token.businessId;
      session.user.role = token.role;
      return session;
    },
  },
};