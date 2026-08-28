import fs from "node:fs";
import { resolveWorkspacePath } from "@/lib/scaffold-modules";

/**
 * Reads the current boilerplate template version from the sync manifest at the
 * repo root. Platform-only; excluded from the downloaded boilerplate.
 */
export function getTemplateVersion(): string {
  try {
    const manifestPath = resolveWorkspacePath("template-sync.manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      templateVersion?: string;
    };
    return manifest.templateVersion ?? "unknown";
  } catch {
    return "unknown";
  }
}
