import { z } from "zod";
import { projectEnvKeys, selectedServices, SERVICE_LABELS } from "./catalog";
import type { DoctorCheck, DoctorReport, LaunchpadProject } from "./types";

export const MAX_REPORT_BYTES = 256 * 1024;
const selection = z.array(z.string().min(1).max(64)).max(32);
const checkSchema = z
  .object({
    group: z.enum(["env", "files", "services"]),
    id: z.string().min(1).max(128),
    status: z.enum(["ok", "warn", "fail"]),
  })
  .strict();
export const doctorReportSchema = z
  .object({
    modules: selection,
    platforms: selection,
    checks: z.array(checkSchema).max(128),
  })
  .strict();

function sameSelection(a: string[], b: string[]) {
  return (
    new Set(a).size === a.length &&
    [...a].sort().join("\0") === [...b].sort().join("\0")
  );
}

export function validateDoctorReport(
  input: unknown,
  project: LaunchpadProject,
): DoctorReport {
  const report = doctorReportSchema.parse(input);
  if (
    !sameSelection(report.modules, project.modules) ||
    !sameSelection(report.platforms, [
      ...new Set(["web", ...project.platforms]),
    ])
  ) {
    throw new Error(
      "This report's modules or platforms do not match the project. Run doctor in this project's downloaded folder.",
    );
  }
  const services = new Set(selectedServices(project));
  const env = new Set(projectEnvKeys(project));
  const files = new Set([
    "apps/web/.env",
    "apps/web/.env.local",
    "packages/database/.env",
    ...(project.platforms.includes("desktop") ? ["apps/desktop/.env"] : []),
    ...(project.platforms.includes("mobile") ? ["apps/mobile/.env"] : []),
    ...(project.modules.includes("ai_agents") ? ["apps/backend/.env"] : []),
  ]);
  const seen = new Set<string>();
  for (const check of report.checks) {
    const allowed =
      check.group === "services"
        ? services
        : check.group === "env"
          ? env
          : files;
    const key = `${check.group}:${check.id}`;
    if (!allowed.has(check.id) || seen.has(key))
      throw new Error(
        "The report contains an unsupported or repeated check for this project.",
      );
    seen.add(key);
  }
  return report;
}

/** Browser boundary: no provider text or arbitrary values reach the network. */
export function sanitizeDoctorReport(
  input: unknown,
  project: LaunchpadProject,
): DoctorReport {
  if (
    new TextEncoder().encode(JSON.stringify(input)).byteLength >
    MAX_REPORT_BYTES
  )
    throw new Error("The report is too large (maximum 256 KB).");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Choose a doctor JSON report.");
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.checks))
    throw new Error("The report must contain a checks array.");
  const checks = raw.checks.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid doctor check.");
    const check = value as Record<string, unknown>;
    return { group: check.group, id: check.id, status: check.status };
  });
  return validateDoctorReport(
    { modules: raw.modules, platforms: raw.platforms, checks },
    project,
  );
}

export function checkExplanation(check: DoctorCheck): string {
  const name =
    check.group === "services"
      ? (SERVICE_LABELS[check.id] ?? "Service")
      : check.id;
  if (check.status === "ok")
    return `${name}: the imported check passed. Verify the corresponding application flow separately.`;
  if (check.status === "warn")
    return `${name}: doctor reported a warning or could not fully verify it. Review the original report locally and rerun after checking the configuration.`;
  return `${name}: doctor reported a failure. Check this environment's configuration and service access, inspect the original report locally, and rerun.`;
}
