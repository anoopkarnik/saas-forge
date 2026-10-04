import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/seed.ts",
  },
  // process.env (not env()) so `prisma generate` works in CI/Docker without a DB URL.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
