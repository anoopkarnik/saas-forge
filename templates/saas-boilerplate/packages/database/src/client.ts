import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

const prismaClientSingleton = () => {
  const useAccelerate = process.env.PRISMA_ACCELERATE_ENABLED === "true";
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL || databaseUrl;
  const databaseUrlUsesAccelerate = /^prisma(\+|:)/.test(databaseUrl ?? "");
  const queryLoggingEnabled = process.env.PRISMA_QUERY_LOGGING === "true";

  if (!useAccelerate && databaseUrlUsesAccelerate && !process.env.DIRECT_URL) {
    throw new Error("DIRECT_URL is required when PRISMA_ACCELERATE_ENABLED is not true and DATABASE_URL uses Prisma Accelerate.");
  }

  const client = new PrismaClient({
    datasources: useAccelerate || !directUrl ? undefined : { db: { url: directUrl } },
    log: queryLoggingEnabled ? [{ emit: "event", level: "query" }] : undefined,
  });

  if (queryLoggingEnabled) {
    (client as any).$on("query", (event: any) => {
      console.info(`[prisma] ${event.duration}ms ${event.query}`);
    });
  }

  return useAccelerate ? client.$extends(withAccelerate()) : client;
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

const prisma: PrismaClient = (globalThis.prismaGlobal ?? prismaClientSingleton()) as PrismaClient

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
