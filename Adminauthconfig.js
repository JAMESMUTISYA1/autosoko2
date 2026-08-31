// Admin auth config — completely separate NextAuth instance from the
// buyer/seller portals. Different cookie name + different secret means an
// admin session literally cannot be read as a buyer/seller session (and a
// buyer/seller session cannot be replayed as an admin one), regardless of
// what role field ends up in either token.

export const adminAuthConfig = {
  providers: [],
  // REQUIRED: this instance is mounted at /api/admin-auth (see
  // app/api/admin-auth/[...nextauth]/route.js), not the library's default
  // /api/auth. Without this, Auth.js tries to strip "/api/auth" off every
  // incoming URL to find the action (session, signin, callback/credentials,
  // etc.), fails on "/api/admin-auth/...", and throws UnknownAction.
  basePath: "/api/admin-auth",
  session: {
    strategy: "jwt",
    // Shorter-lived admin sessions — admin is the highest-value target.
    maxAge: 60 * 60 * 8, // 8 hours
  },
  secret: process.env.ADMIN_AUTH_SECRET, // MUST be a distinct secret from AUTH_SECRET

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-admin-session-token"
          : "admin-session-token",
      options: {
        httpOnly: true,
        // "strict" (not "lax"): the admin cookie is never needed for a
        // cross-site top-level navigation into the app (no OAuth provider
        // on this portal, no email magic links, nothing admin should ever
        // be reached from a link on another site). "strict" means the
        // browser won't attach it even to a legitimate cross-site GET,
        // which closes off CSRF vectors that "lax" still allows through
        // top-level navigations. If an OAuth/email provider is ever added
        // to the admin portal, this needs to go back to "lax" or the
        // callback redirect will fail to include the cookie.
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    // IMPORTANT: every NextAuth instance on the same domain shares the
    // library's *default* cookie names unless told otherwise. sessionToken
    // was overridden above, but csrfToken/callbackUrl were not — so the
    // admin, seller, and buyer instances were all reading/writing the SAME
    // csrf cookie, and whichever portal's page loaded most recently would
    // clobber the token another portal's form submit expected. That's what
    // produces "Bad request." on sign-in. Giving each its own name fixes it.
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-admin-csrf-token"
          : "admin-csrf-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-admin-callback-url"
          : "admin-callback-url",
      options: {
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  pages: {
    signIn: "/admin/login",
  },

  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub;
      session.user.role = token.role;
      return session;
    },
  },
};