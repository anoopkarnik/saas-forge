import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(repoRoot, "packages/database/.env") });
dotenv.config({ path: path.join(repoRoot, "apps/web/.env") });

const { default: prisma } = await import("../src/client");
const { backfillOnboarding } = await import("../src/backfillOnboarding");

try {
  const marked = await backfillOnboarding(prisma);
  console.log(`Marked onboarding as seen for ${marked} existing user(s).`);
} finally {
  await prisma.$disconnect();
}
