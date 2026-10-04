import { createHash } from "node:crypto";

/**
 * Pure project rules shared by the tRPC router, REST routes and scaffold service.
 * Keep this module dependency-light: it is imported by the /api/trpc function.
 */

/**
 * Stable content hash of the buildable inputs. An unchanged config re-downloads
 * for free because its hash matches `lastBuiltHash`.
 */
export function computeBuildHash(project: {
  modules: string[];
  tierId: string;
  versionId: string;
  platforms: string[];
  templateVersion: string;
  config: unknown;
}): string {
  const payload = JSON.stringify({
    modules: [...project.modules].sort(),
    tierId: project.tierId,
    versionId: project.versionId,
    platforms: [...project.platforms].sort(),
    templateVersion: project.templateVersion,
    config: project.config,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function tierOrder(tierId: string): number {
  const parsed = Number.parseInt(String(tierId).replace(/^tier-/, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
