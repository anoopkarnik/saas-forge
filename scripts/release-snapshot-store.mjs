import fs from "fs";
import path from "path";
import { getReleaseSnapshotStore } from "../apps/web/lib/scaffold/release-snapshots.ts";

/**
 * The R2 store release snapshots go to: the bucket production reads, with the
 * credentials from the shell or, when unset there, apps/web/.env.
 */
export function releaseSnapshotStore(repoRoot) {
  const envFile = path.join(repoRoot, "apps", "web", ".env");
  if (!process.env.R2_BUCKET_NAME && fs.existsSync(envFile)) process.loadEnvFile(envFile);
  return getReleaseSnapshotStore(process.env);
}
