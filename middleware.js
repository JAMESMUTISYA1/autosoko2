import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Uses auth.config.js (no Prisma import) rather than the full auth.js —
// middleware runs on every matched request, so it must never depend on
// a database client. See auth.config.js and BACKEND.md for why.
const { auth } = NextAuth(authConfig);

export default auth; // authConfig's `authorized` callback (auth.config.js) does the actual route gating

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/seller/:path*"],
};
