import bcrypt from "bcryptjs";

// Cost factor 12: OWASP's current baseline recommendation for bcrypt.
// bcryptjs (pure JS, no native compilation) is used deliberately over
// native bcrypt or argon2 — this runs inside Next.js API routes on
// Vercel, where native addons complicate serverless deployment; bcryptjs
// avoids that entirely at a small, acceptable throughput cost for an
// operation that only runs at login/registration, not per-request.
const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, hash) {
  if (!hash) return false; // OAuth-only accounts have no password hash
  return bcrypt.compare(plainPassword, hash);
}
