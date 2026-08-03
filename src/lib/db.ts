import { PrismaClient } from "@prisma/client";

// Bump to force a dev client refresh after schema changes.
const SCHEMA_SIG = "vw-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  __vwSchemaSig?: string;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
  });
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.__vwSchemaSig === SCHEMA_SIG
) {
  // reuse
} else {
  globalForPrisma.prisma = createClient();
  globalForPrisma.__vwSchemaSig = SCHEMA_SIG;
}

export const db = globalForPrisma.prisma!;
