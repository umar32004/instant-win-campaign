import { PrismaClient } from "@prisma/client";

/**
 * Reuse a single PrismaClient instance across hot reloads in dev (Next.js
 * dev server re-evaluates modules on every change, which would otherwise
 * exhaust the SQL Server connection pool).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
