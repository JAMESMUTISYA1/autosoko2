// Deliberately minimal and DB-free — imported by middleware.js, which
// runs on every matched request. Verifying an already-issued JWT only
// needs the session secret, not the full provider list or the
// DB-touching callbacks that created the token in the first place.
// auth.js (the full config) imports and extends this with those.
export const authConfig = {
  providers: [], // populated in auth.js; middleware never needs to authenticate, only to read
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    // Runs in middleware to decide route access. Reads only what's
    // already in the token (attached by auth.js's jwt callback at
    // sign-in) — no database call here, which is what keeps middleware
    // fast and Edge-Runtime-safe.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      const isAuthenticated = Boolean(auth?.user);

      const ADMIN_ROLES = new Set(["Super Admin", "Ops Admin"]);
      const AGENT_ROLES = new Set(["Agent", ...ADMIN_ROLES]);

      if (pathname.startsWith("/admin")) {
        return isAuthenticated && ADMIN_ROLES.has(role);
      }
      if (pathname.startsWith("/agent")) {
        return isAuthenticated && AGENT_ROLES.has(role);
      }
      if (pathname.startsWith("/seller")) {
        return isAuthenticated; // any signed-in user can sell
      }
      return true;
    },
  },
};
