import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// This file intentionally does NOT delegate to any single NextAuth
// instance's `auth` export (as the old middleware did). With three
// independent sessions (buyer, seller, admin) there is no single
// "authorized" callback that can see all three cookies at once, so we read
// each portal's own JWT directly with the matching cookie name + secret.
// This is also what guarantees isolation: /admin is only ever evaluated
// against the admin cookie/secret, /seller only against the seller
// cookie/secret, and so on — there's no code path where one portal's
// token can satisfy another portal's check.

const ADMIN_ROLES = new Set(["Super Admin", "Ops Admin"]);
const AGENT_ROLES = new Set(["Agent"]);

const isProd = process.env.NODE_ENV === "production";

const BUYER_COOKIE = isProd ? "__Secure-authjs.buyer-session-token" : "authjs.buyer-session-token";
const ADMIN_COOKIE = isProd ? "__Secure-admin-session-token" : "admin-session-token";
const SELLER_COOKIE = isProd ? "__Secure-seller-session-token" : "seller-session-token";

function redirectTo(request, path) {
  const url = new URL(path, request.url);
  url.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ---------------- Admin portal ----------------
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname === "/admin/forgot-password") {
      return NextResponse.next();
    }
    const token = await getToken({
      req: request,
      cookieName: ADMIN_COOKIE,
      secret: process.env.ADMIN_AUTH_SECRET,
    });
    const role = token?.role;
    if (!token || typeof role !== "string" || !ADMIN_ROLES.has(role)) {
      return redirectTo(request, "/admin/login");
    }
    return NextResponse.next();
  }

  // ---------------- Seller portal ----------------
  if (pathname.startsWith("/seller")) {
    if (pathname === "/seller/login" || pathname === "/seller/forgot-password") {
      return NextResponse.next();
    }
    const token = await getToken({
      req: request,
      cookieName: SELLER_COOKIE,
      secret: process.env.SELLER_AUTH_SECRET,
    });
    if (!token || !token.businessId) {
      return redirectTo(request, "/seller/login");
    }
    return NextResponse.next();
  }

  // ---------------- Agent area (part of the buyer/platform session) ----------------
  if (pathname.startsWith("/agent")) {
    const token = await getToken({
      req: request,
      cookieName: BUYER_COOKIE,
      secret: process.env.AUTH_SECRET,
    });
    const role = token?.role;
    if (!token || typeof role !== "string" || !AGENT_ROLES.has(role)) {
      return redirectTo(request, "/auth/login");
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/seller/:path*"],
};