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
  ai?: LaunchpadAIState;
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
export const BRIEF_FIELDS = [
  "audience",
  "journey",
  "setup",
  "os",
  "launch",
] as const;
export type BriefField = (typeof BRIEF_FIELDS)[number];
export type BriefAnswers = Record<BriefField, string>;
export type LaunchpadOperationKind = "interview" | "generate" | "help";
export type BriefQuestion = {
  id: BriefField;
  question: string;
  suggestion: string;
};
export type ProjectBrief = {
  revision: number;
  answers: BriefAnswers;
  summary: string;
  confirmedRevision: number | null;
  followupRound: number;
  questions: BriefQuestion[];
};
export type GeneratedTask = {
  key: string;
  anchorId: string;
  title: string;
  purpose: string;
  instructions: string[];
  technicalDetails: string[];
  commandIds: string[];
  filePaths: string[];
  acceptance: string[];
  verification: string;
  fixes: string[];
  sourceIds: string[];
  dependencies: string[];
};
export type LaunchpadAgentResult =
  | { kind: "interview"; summary: string; questions: BriefQuestion[] }
  | { kind: "generate"; tasks: GeneratedTask[] }
  | { kind: "help"; answer: string; sourceIds: string[] };
export type GuideSource = {
  id: string;
  label: string;
  excerpt: string;
  url?: string;
};
export type SourcePack = {
  version: string;
  stage: StageId;
  project: {
    modules: string[];
    platforms: string[];
    providers: Record<string, string>;
    templateVersion: string;
    deployment: string;
  };
  anchors: Array<{
    id: string;
    title: string;
    purpose: string;
    instructions: string[];
    acceptance: string[];
    verification: string;
    fixes: string[];
    sourceIds: string[];
  }>;
  sources: GuideSource[];
  commands: Array<{ id: string; label: string; command: string }>;
  paths: string[];
  envKeys: string[];
  completedAnchors: string[];
  coverageRequirements?: CoverageRequirement[];
  completedRequirements?: string[];
  serverCheckAnchors?: string[];
  completedTasks?: Array<{
    anchorId: string;
    title: string;
    instructions: string[];
  }>;
};
export type CoverageRequirement = {
  id: string;
  anchorId: string;
  kind: "account" | "environment";
  title: string;
  terms: string[];
  optional: boolean;
};
export type GuidedTask = LaunchpadTask & {
  anchorId: string;
  anchorSignature: string;
  sourceIds: string[];
  generated: true;
};
export type AcceptedStage = {
  briefAnswers?: BriefAnswers;
  briefSummary?: string;
  fingerprint: string;
  briefRevision: number;
  sourceVersion: string;
  acceptedAt: string;
  tasks: GuidedTask[];
};
export type OperationReference = {
  jobId: string;
  kind: LaunchpadOperationKind;
  stage: StageId;
  taskId?: string;
  fingerprint: string;
  briefRevision: number;
  createdAt: string;
  applied?: boolean;
  discarded?: boolean;
};
export type TaskHelp = {
  taskId: string;
  question: string;
  answer: string;
  sourceIds: string[];
  at: string;
};
export type LaunchpadAIState = {
  version: 2;
  brief: ProjectBrief;
  stages: Partial<Record<StageId, AcceptedStage>>;
  operations: OperationReference[];
  helpHistory: TaskHelp[];
};
export type OperationView = OperationReference & {
  commands?: SourcePack["commands"];
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  result: LaunchpadAgentResult | null;
  error: string | null;
  stale: boolean;
};
export type LaunchpadAIView = {
  brief: ProjectBrief | null;
  operations: OperationView[];
  helpHistory: TaskHelp[];
  stageStale: Partial<Record<StageId, boolean>>;
};
