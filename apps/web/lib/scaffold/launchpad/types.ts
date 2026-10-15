export const GUIDE_MODES = ["founder", "builder", "developer"] as const;
export type GuideMode = (typeof GUIDE_MODES)[number];
export const DEPLOYMENT_PATHS = ["vercel", "docker"] as const;
export type DeploymentPath = (typeof DEPLOYMENT_PATHS)[number];
export const REPORT_SCOPES = ["local", "production"] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];
export const STAGES = [
  {
    id: "local",
    title: "Run locally",
    description:
      "Connect your services and get a working development environment.",
  },
  {
    id: "mvp",
    title: "Build your MVP",
    description: "Make one useful customer journey work from end to end.",
  },
  {
    id: "launch",
    title: "Launch",
    description: "Configure, test, and release your selected platforms.",
  },
  {
    id: "operate",
    title: "Operate",
    description: "Protect your data, monitor the app, and keep it up to date.",
  },
] as const;
export type StageId = (typeof STAGES)[number]["id"];
export type LaunchpadProject = {
  name: string;
  slug?: string;
  modules: string[];
  platforms: string[];
  templateVersion: string;
  config: Record<string, unknown>;
};
export type LaunchpadTask = {
  anchorId?: string;
  sourceIds?: string[];
  generated?: boolean;
  id: string;
  stage: StageId;
  title: string;
  purpose: string;
  prerequisites: string[];
  presentations: Record<GuideMode, string[]>;
  commands: Array<{ label: string; command: string }>;
  acceptance: string[];
  fixes: string[];
  links: Array<{ label: string; url: string }>;
  verification: string;
  checkId?: string;
  scope?: ReportScope;
  /** Changes when the task's applicable instructions change. */
  signature: string;
};
export type DoctorCheck = {
  group: "env" | "files" | "services";
  id: string;
  status: "ok" | "warn" | "fail";
};
export type DoctorReport = {
  modules: string[];
  platforms: string[];
  checks: DoctorCheck[];
};
export type SavedReport = {
  fingerprint: string;
  importedAt: string;
  report: DoctorReport;
};
export type LaunchpadState = {
  ai?: import("./ai-types").LaunchpadAIState;
  mode: GuideMode;
  deployment: DeploymentPath;
  manual: Record<string, string>;
  reports: Partial<Record<ReportScope, SavedReport>>;
};
export type TaskStatus =
  | "not_checked"
  | "manual"
  | "passed"
  | "warning"
  | "failed";
