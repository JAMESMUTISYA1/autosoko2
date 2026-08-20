// test-db.js
import { db } from "./lib/db.js";

async function main() {
  try {
    console.log("Attempting database connection...");
    await db.$connect();
    const result = await db.$queryRaw`SELECT 1 AS test`;
    console.log("✅ Database connected, result:", result);
  } catch (error) {
    console.error("❌ Connection failed:", error);
  } finally {
    await db.$disconnect();
  }
}

main();