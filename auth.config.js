import { NextResponse } from "next/server";

export const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login", // fallback for non-admin routes
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      const isAuthenticated = Boolean(auth?.user);

      const ADMIN_ROLES = new Set(["Super Admin", "Ops Admin"]);
      const AGENT_ROLES = new Set(["Agent", ...ADMIN_ROLES]);

      // Allow admin login page without authentication
     if (pathname === "/admin/login" || pathname === "/admin/forgot-password") {
  return true;
}

      // Admin routes
      if (pathname.startsWith("/admin")) {
        if (isAuthenticated && ADMIN_ROLES.has(role)) {
          return true;
        }
        // If not authenticated or not admin, redirect to admin login
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Agent routes
      if (pathname.startsWith("/agent")) {
        if (isAuthenticated && AGENT_ROLES.has(role)) {
          return true;
        }
        // Redirect agents to a future agent login, or use admin login for now
        const loginUrl = new URL("/admin/login", request.url); // adjust if separate agent login exists
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Seller routes: any signed-in user
      if (pathname.startsWith("/seller")) {
        if (isAuthenticated) {
          return true;
        }
        // Redirect to normal user login for sellers
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }

      // All other routes are allowed
      return true;
    },
  },
};