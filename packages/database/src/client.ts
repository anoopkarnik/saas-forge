import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client"

const prismaClientSingleton = () => {
  const queryLoggingEnabled = process.env.PRISMA_QUERY_LOGGING === "true";

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: queryLoggingEnabled ? [{ emit: "event", level: "query" }] : undefined,
  });

  if (queryLoggingEnabled) {
    (client as any).$on("query", (event: any) => {
      console.info(`[prisma] ${event.duration}ms ${event.query}`);
    });
  }

  return client;
}

declare global {
  var prismaGlobal: undefined | PrismaClient
}

const prisma: PrismaClient = (globalThis.prismaGlobal ?? prismaClientSingleton()) as PrismaClient

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
