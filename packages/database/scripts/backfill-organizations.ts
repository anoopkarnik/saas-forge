import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(repoRoot, "packages/database/.env") });
dotenv.config({ path: path.join(repoRoot, "apps/web/.env") });

const { default: prisma } = await import("../src/client");
const { backfillOrganizations } = await import("../src/backfillOrganizations");

try {
  const created = await backfillOrganizations(prisma);
  console.log(`Created ${created} personal workspace(s).`);
} finally {
  await prisma.$disconnect();
}
