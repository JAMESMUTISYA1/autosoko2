import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db =
  process.env.NODE_ENV === "production"
    ? globalForPrisma.prisma ?? createPrismaClient()
    : createPrismaClient();

if (process.env.NODE_ENV === "production") {
  globalForPrisma.prisma = db;
}