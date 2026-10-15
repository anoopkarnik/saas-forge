import { validateDoctorReport } from "./report";
import { activeWalkthroughTasks, walkthroughTasks } from "./ai-state";
import type {
  DeploymentPath,
  DoctorReport,
  GuideMode,
  LaunchpadProject,
  LaunchpadState,
  ReportScope,
  TaskStatus,
} from "./types";

export function defaultLaunchpadState(): LaunchpadState {
  return { mode: "builder", deployment: "vercel", manual: {}, reports: {} };
}

/** Non-secret selectors only; changing branding alone does not invalidate evidence. */
export function projectFingerprint(project: LaunchpadProject): string {
  const names = [
    "NEXT_PUBLIC_PAYMENT_GATEWAY",
    "NEXT_PUBLIC_IMAGE_STORAGE",
    "NEXT_PUBLIC_CMS",
    "NEXT_PUBLIC_AUTH_PROVIDERS",
    "NEXT_PUBLIC_AUTH_EMAIL",
    "NEXT_PUBLIC_AUTH_GOOGLE",
    "NEXT_PUBLIC_AUTH_GITHUB",
    "NEXT_PUBLIC_AUTH_LINKEDIN",
    "NEXT_PUBLIC_EMAIL_CLIENT",
    "NEXT_PUBLIC_OBSERVABILITY_FEATURES",
    "NEXT_PUBLIC_ALLOW_RATE_LIMIT",
    "NEXT_PUBLIC_AI_ENABLED",
    "NEXT_PUBLIC_URL",
    "KEEP_ALL_PROVIDERS",
  ];
  return JSON.stringify({
    version: project.templateVersion,
    modules: [...project.modules].sort(),
    platforms: [...project.platforms].sort(),
    choices: names.map((name) => [
      name,
      Array.isArray(project.config[name])
        ? [...(project.config[name] as string[])].sort()
        : (project.config[name] ?? null),
    ]),
  });
}

export function buildLaunchpad(
  project: LaunchpadProject,
  saved: LaunchpadState | null,
) {
  const state = saved ?? defaultLaunchpadState();
  const fingerprint = projectFingerprint(project);
  const tasks = activeWalkthroughTasks(project, state).map((task) => {
    const report = task.scope ? state.reports[task.scope] : undefined;
    const evidence =
      report?.fingerprint === fingerprint
        ? report.report.checks.find(
            (check) => check.group === "services" && check.id === task.checkId,
          )
        : undefined;
    let status: TaskStatus =
      state.manual[task.id] === task.signature ? "manual" : "not_checked";
    if (evidence)
      status =
        evidence.status === "ok"
          ? "passed"
          : evidence.status === "warn"
            ? "warning"
            : "failed";
    return {
      ...task,
      status,
      manuallyCompleted: state.manual[task.id] === task.signature,
      importedAt: evidence ? report!.importedAt : null,
    };
  });
  const completed = tasks.filter(
    (task) => task.status === "manual" || task.status === "passed",
  ).length;
  const next = tasks.find(
    (task) => task.status !== "manual" && task.status !== "passed",
  );
  return {
    project: {
      name: project.name,
      slug: project.slug ?? "project",
      modules: project.modules,
      platforms: project.platforms,
      templateVersion: project.templateVersion,
      config: project.config,
    },
    mode: state.mode,
    deployment: state.deployment,
    tasks,
    summary: {
      completed,
      total: tasks.length,
      started: completed > 0 || Object.keys(state.reports).length > 0,
      nextTask: next
        ? { id: next.id, title: next.title, stage: next.stage }
        : null,
    },
    reports: Object.fromEntries(
      Object.entries(state.reports).map(([scope, report]) => [
        scope,
        {
          importedAt: report.importedAt,
          stale: report.fingerprint !== fingerprint,
          checks: report.report.checks,
        },
      ]),
    ),
    recheckRequired: Object.values(state.reports).some(
      (report) => report.fingerprint !== fingerprint,
    ),
  };
}

export function savePreferences(
  project: LaunchpadProject,
  saved: LaunchpadState | null,
  input: { mode?: GuideMode; deployment?: DeploymentPath },
): LaunchpadState {
  const state = { ...(saved ?? defaultLaunchpadState()), ...input };
  const signatures = new Map(
    activeWalkthroughTasks(project, state).map((task) => [
      task.id,
      task.signature,
    ]),
  );
  return {
    ...state,
    manual: Object.fromEntries(
      Object.entries(state.manual).filter(
        ([id, signature]) => signatures.get(id) === signature,
      ),
    ),
  };
}

export function completeTask(
  project: LaunchpadProject,
  saved: LaunchpadState | null,
  taskId: string,
  complete: boolean,
): LaunchpadState {
  const state = saved ?? defaultLaunchpadState();
  const task = [
    ...activeWalkthroughTasks(project, state),
    ...walkthroughTasks(project, state),
  ].find((task) => task.id === taskId);
  if (!task) throw new Error("This task is not applicable to the project.");
  const manual = { ...state.manual };
  if (complete) manual[taskId] = task.signature;
  else delete manual[taskId];
  return { ...state, manual };
}

export function importReport(
  project: LaunchpadProject,
  saved: LaunchpadState | null,
  input: DoctorReport,
  scope: ReportScope,
): LaunchpadState {
  const report = validateDoctorReport(input, project);
  const state = saved ?? defaultLaunchpadState();
  return {
    ...state,
    reports: {
      ...state.reports,
      [scope]: {
        fingerprint: projectFingerprint(project),
        importedAt: new Date().toISOString(),
        report,
      },
    },
  };
}
