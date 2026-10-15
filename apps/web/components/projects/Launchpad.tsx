"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileCheck2,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { useTRPC } from "@/trpc/client";
import {
  checkExplanation,
  MAX_REPORT_BYTES,
  sanitizeDoctorReport,
} from "@/lib/scaffold/launchpad/report";
import {
  STAGES,
  type DeploymentPath,
  type DoctorReport,
  type GuideMode,
  type ReportScope,
  type StageId,
  type TaskStatus,
} from "@/lib/scaffold/launchpad/types";
import type { getLaunchpad } from "@/lib/scaffold/launchpad/service";
import { ReleaseNotesPanel, SecurityBanner } from "./UpgradeCenter";
import {
  OperationStatus,
  TaskHelpPanel,
  operationActive,
  type LaunchpadAIActions,
} from "./LaunchpadAI";

type LaunchpadData = Awaited<ReturnType<typeof getLaunchpad>>;
const STATUS: Record<TaskStatus, string> = {
  not_checked: "Not checked",
  manual: "Marked complete",
  passed: "Passed imported check",
  warning: "Warning",
  failed: "Failed",
};

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy. Select the text and copy it manually.");
  }
}

function exportGuide(data: LaunchpadData) {
  const url = URL.createObjectURL(
    new Blob([data.markdown], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.project.slug ?? "project"}-launchpad.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const selectStyle =
  "min-h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LaunchpadView({
  data,
  onPreferences,
  onComplete,
  onImport,
  busy,
  releases,
  onStartOperation,
  onCancelOperation,
}: LaunchpadAIActions & {
  data: LaunchpadData;
  onPreferences: (preferences: {
    mode?: GuideMode;
    deployment?: DeploymentPath;
  }) => void;
  onComplete: (id: string, complete: boolean) => void;
  onImport: (report: DoctorReport, scope: ReportScope) => Promise<unknown>;
  busy: boolean;
  releases?: ReactNode;
}) {
  const [stage, setStage] = useState<StageId>(
    data.summary.nextTask?.stage ?? "local",
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    data.summary.nextTask?.id ?? null,
  );
  const [focusTask, setFocusTask] = useState<string | null>(null);
  useEffect(() => {
    if (!focusTask) return;
    const heading = document.getElementById(`title-${focusTask}`);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: "start" });
    setFocusTask(null);
  }, [focusTask, stage]);
  const [scope, setScope] = useState<ReportScope>("local");
  const [importError, setImportError] = useState<string | null>(null);
  const [readingReport, setReadingReport] = useState(false);
  const currentStage = STAGES.find((item) => item.id === stage)!;
  const stageTasks = data.tasks.filter((task) => task.stage === stage);
  const selectedTask =
    stageTasks.find((task) => task.id === selectedTaskId) ?? stageTasks[0];
  const aiActions = {
    onStartOperation,
    onCancelOperation,
  };
  const activeOperation = data.ai.operations.find(operationActive);
  const canGenerate = !activeOperation;
  const completed = (status: TaskStatus) =>
    status === "manual" || status === "passed";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <Link
        href="/projects"
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> My Projects
      </Link>
      <header className="rounded-xl border bg-card p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Rocket className="size-4" aria-hidden="true" /> Project Launchpad
            </p>
            <h1 className="break-words text-3xl font-semibold tracking-tight">
              {data.project.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your path from a working starter to a product you can run with
              confidence.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Starter v{data.project.templateVersion} ·{" "}
              {data.project.platforms.join(", ")} ·{" "}
              {data.project.modules.length
                ? data.project.modules.join(", ")
                : "Core only"}
            </p>
          </div>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => exportGuide(data)}
          >
            <Download aria-hidden="true" /> Export guide
          </Button>
        </div>
        <div className="mt-6 grid gap-5 border-t pt-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Web deployment
            <select
              className={selectStyle}
              value={data.deployment}
              disabled={busy}
              onChange={(event) =>
                onPreferences({
                  deployment: event.target.value as DeploymentPath,
                })
              }
            >
              <option value="vercel">Vercel</option>
              <option value="docker">Docker self-hosting</option>
            </select>
          </label>
          <div className="flex flex-col justify-center gap-2">
            <p className="text-sm" role="status">
              {data.summary.completed} of {data.summary.total} tasks complete
            </p>
            <progress
              className="h-2 w-full accent-primary"
              aria-label="Launchpad task completion"
              value={data.summary.completed}
              max={data.summary.total}
            />
            <p className="text-xs text-muted-foreground">
              Manual completion and imported checks are shown separately.
            </p>
          </div>
        </div>
        {data.summary.nextTask ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next task
              </p>
              <p className="mt-1 text-sm font-medium">
                {data.summary.nextTask.title}
              </p>
            </div>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => {
                setStage(data.summary.nextTask!.stage);
                setSelectedTaskId(data.summary.nextTask!.id);
                setFocusTask(data.summary.nextTask!.id);
              }}
            >
              Continue setup <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <p className="mt-5 text-sm">
            All current tasks are complete. Revisit checks when your app or
            configuration changes.
          </p>
        )}
      </header>

      {data.recheckRequired ? (
        <p
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
        >
          Your project selection or starter version changed. Previous reports
          need rechecking; unchanged manual tasks are preserved.
        </p>
      ) : null}
      {releases}
      {activeOperation ? (
        <OperationStatus
          operation={activeOperation}
          busy={busy}
          {...aiActions}
        />
      ) : null}

      <div className="flex flex-col gap-6">
        <nav
          aria-label="Launchpad stages"
          className="hidden gap-2 lg:grid lg:grid-cols-4"
        >
          {STAGES.map((item, index) => {
            const tasks = data.tasks.filter((task) => task.stage === item.id);
            const count = tasks.filter((task) => completed(task.status)).length;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={stage === item.id ? "step" : undefined}
                aria-label={`${item.title} — ${count} of ${tasks.length} complete`}
                onClick={() => {
                  setStage(item.id);
                  setSelectedTaskId(null);
                }}
                className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${stage === item.id ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-muted"}`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${stage === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {count === tasks.length ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {count} of {tasks.length} complete
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
        <section className="min-w-0" aria-label={currentStage.title}>
          <label className="mb-5 flex flex-col gap-2 text-sm font-medium lg:hidden">
            Stage
            <select
              className={selectStyle}
              value={stage}
              aria-label="Stage"
              onChange={(event) => {
                setStage(event.target.value as StageId);
                setSelectedTaskId(null);
              }}
            >
              {STAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {currentStage.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStage.description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Work in any order. Completed tasks remain available.
              </p>
            </div>
            <p className="max-w-72 text-xs text-muted-foreground">
              Reviewed steps are ready immediately. AI is optional and only used
              when you ask for help with a task.
            </p>
          </div>
          <label className="mb-4 flex flex-col gap-2 text-sm font-medium lg:hidden">
            Task
            <select
              className={selectStyle}
              value={selectedTask?.id ?? ""}
              aria-label="Task"
              onChange={(event) => setSelectedTaskId(event.target.value)}
            >
              {stageTasks.map((task, index) => (
                <option key={task.id} value={task.id}>
                  {index + 1}. {task.title} — {STATUS[task.status]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <nav
              aria-label="Stage tasks"
              className="hidden rounded-xl border lg:sticky lg:top-6 lg:block lg:max-h-[75vh] lg:overflow-y-auto"
            >
              <ol>
                {stageTasks.map((task, index) => (
                  <li key={task.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      aria-current={
                        selectedTask?.id === task.id ? "step" : undefined
                      }
                      aria-label={`${task.title} — ${STATUS[task.status]}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`flex min-h-16 w-full items-start gap-3 p-4 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selectedTask?.id === task.id ? "bg-primary/10" : "hover:bg-muted"}`}
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs">
                        {completed(task.status) ? (
                          <Check className="size-3" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span>
                        <span className="block font-medium">{task.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {STATUS[task.status]}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="min-w-0">
              {(selectedTask ? [selectedTask] : []).map((task) => (
                <article
                  key={task.id}
                  id={task.id}
                  className="rounded-xl border bg-card p-5 md:p-6"
                  aria-labelledby={`title-${task.id}`}
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs text-muted-foreground">
                        Task{" "}
                        {stageTasks.findIndex((item) => item.id === task.id) +
                          1}
                        {task.scope
                          ? ` · ${task.scope === "local" ? "Local" : "Production"} environment`
                          : ""}
                      </p>
                      <h3
                        id={`title-${task.id}`}
                        tabIndex={-1}
                        className="text-lg font-semibold"
                      >
                        {task.title}
                      </h3>
                    </div>
                    <Badge
                      variant={
                        task.status === "failed"
                          ? "destructive"
                          : task.status === "passed"
                            ? "default"
                            : "outline"
                      }
                    >
                      {STATUS[task.status]}
                    </Badge>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {task.purpose}
                  </p>
                  {task.prerequisites.length ? (
                    <p className="mb-4 text-sm">
                      <span className="font-medium">Before you start: </span>
                      {task.prerequisites.join(" · ")}
                    </p>
                  ) : null}
                  <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
                    {task.presentations.builder.map((instruction, n) => (
                      <li key={n}>{instruction}</li>
                    ))}
                  </ol>
                  {task.presentations.developer.length ? (
                    <details className="mt-4 rounded-md border p-3">
                      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                        Technical details
                      </summary>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                        {task.presentations.developer.map((instruction, n) => (
                          <li key={n}>{instruction}</li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                  {task.commands.length ? (
                    <div className="mt-4 flex flex-col gap-3">
                      {task.commands.map((command) => (
                        <div key={command.command}>
                          <p className="mb-1 text-xs text-muted-foreground">
                            {command.label}
                          </p>
                          <div className="flex items-start gap-2 rounded-md bg-muted p-3">
                            <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-xs leading-6">
                              {command.command}
                            </code>
                            <Button
                              className="min-h-11 min-w-11 shrink-0"
                              size="icon"
                              variant="ghost"
                              aria-label={`Copy command: ${command.command}`}
                              onClick={() => copyText(command.command)}
                            >
                              <Copy className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium">
                      What success looks like
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {task.acceptance.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {task.verification}
                    </p>
                  </div>
                  <details className="mt-3 text-sm">
                    <summary className="min-h-11 cursor-pointer py-3 font-medium">
                      Troubleshooting and references
                    </summary>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
                      {task.fixes.map((fix) => (
                        <li key={fix}>{fix}</li>
                      ))}
                    </ul>
                  </details>
                  <div
                    className="mt-4 border-t pt-4"
                    aria-label="Task documentation"
                  >
                    <p className="text-sm font-medium">
                      Documentation and sources
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      These references support the guide. Starter-specific file
                      paths and commands are explained in the instructions
                      above.
                    </p>
                    {task.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block min-h-11 w-fit py-3 text-sm text-primary underline underline-offset-4"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      {task.importedAt
                        ? `Imported ${new Date(task.importedAt).toLocaleString()} · user-supplied report`
                        : "Progress is optional; it never blocks your project."}
                    </p>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      onClick={() =>
                        onComplete(task.id, !task.manuallyCompleted)
                      }
                    >
                      {task.manuallyCompleted
                        ? "Undo completion"
                        : "Mark complete"}
                    </Button>
                  </div>
                  <TaskHelpPanel
                    key={task.id}
                    ai={data.ai}
                    taskId={task.id}
                    stage={stage}
                    busy={busy}
                    canGenerate={canGenerate}
                    {...aiActions}
                  />
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section
        className="rounded-xl border p-5 md:p-6"
        aria-labelledby="report-heading"
      >
        <h2
          id="report-heading"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <FileCheck2 className="size-5" aria-hidden="true" /> Import
          verification results
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Run the command in your downloaded project, using the environment you
          intend to check. We import check names and statuses; credentials and
          provider messages stay on your device. Reports are user-supplied
          evidence, and a local pass does not verify production.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-xs leading-6">
            pnpm --silent doctor --json &gt; launchpad-report.json
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label="Copy report command"
            onClick={() =>
              copyText("pnpm --silent doctor --json > launchpad-report.json")
            }
          >
            <Copy aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Report environment
            <select
              className={selectStyle}
              value={scope}
              disabled={busy || readingReport}
              onChange={(event) => setScope(event.target.value as ReportScope)}
            >
              <option value="local">Local</option>
              <option value="production">Production</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Import doctor JSON report
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy || readingReport}
              className="min-h-11 min-w-0 rounded-md border p-2 text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setImportError(null);
                setReadingReport(true);
                try {
                  if (file.size > MAX_REPORT_BYTES)
                    throw new Error(
                      "The report is too large (maximum 256 KB).",
                    );
                  const report = sanitizeDoctorReport(
                    JSON.parse(await file.text()),
                    data.project,
                  );
                  await onImport(report, scope);
                } catch (error) {
                  setImportError(
                    error instanceof SyntaxError
                      ? "Choose a valid JSON file generated by pnpm doctor --json."
                      : error instanceof Error
                        ? error.message
                        : "Could not import the report.",
                  );
                } finally {
                  input.value = "";
                  setReadingReport(false);
                }
              }}
            />
          </label>
        </div>
        {readingReport ? (
          <p role="status" className="mt-3 text-sm">
            Importing report…
          </p>
        ) : null}
        {importError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {importError}
          </p>
        ) : null}
        {Object.entries(data.reports).map(([environment, report]) => (
          <details key={environment} className="mt-4 rounded-md border p-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
              {environment === "local" ? "Local" : "Production"} report ·
              imported {new Date(report.importedAt).toLocaleString()}
              {report.stale ? " · Recheck required" : ""}
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {report.checks.map((check) => (
                <li key={`${check.group}:${check.id}`}>
                  {checkExplanation(check)}
                </li>
              ))}
            </ul>
            {!report.checks.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No explicit check results in this report. Nothing was
                automatically completed.
              </p>
            ) : null}
          </details>
        ))}
      </section>
    </div>
  );
}

export function Launchpad({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const query = useQuery({
    ...trpc.project.launchpad.queryOptions({ slug }),
    refetchInterval: (current) =>
      current.state.data?.ai.operations.some(operationActive) ? 2000 : false,
  });
  const releases = useQuery(trpc.project.releases.queryOptions({ slug }));
  const onSuccess = async (data: LaunchpadData) => {
    qc.setQueryData(trpc.project.launchpad.queryKey({ slug }), data);
    await qc.invalidateQueries({
      queryKey: trpc.project.launchpadSummaries.queryKey(),
    });
  };
  const onError = (error: { message: string }) => toast.error(error.message);
  const preferences = useMutation(
    trpc.project.saveLaunchpadPreferences.mutationOptions({
      onSuccess,
      onError,
    }),
  );
  const complete = useMutation(
    trpc.project.completeLaunchpadTask.mutationOptions({ onSuccess, onError }),
  );
  const report = useMutation(
    trpc.project.importLaunchpadReport.mutationOptions({ onSuccess, onError }),
  );
  const startOperation = useMutation(
    trpc.project.startLaunchpadOperation.mutationOptions({
      onSuccess,
      onError,
    }),
  );
  const cancelOperation = useMutation(
    trpc.project.cancelLaunchpadOperation.mutationOptions({
      onSuccess,
      onError,
    }),
  );
  if (query.isLoading)
    return (
      <p className="p-8 text-sm text-muted-foreground" role="status">
        Loading your Launchpad…
      </p>
    );
  if (query.error || !query.data)
    return (
      <div className="flex flex-col gap-4 p-8">
        <p role="alert">{query.error?.message ?? "Project not found."}</p>
        <Button
          className="min-h-11 w-fit"
          variant="outline"
          onClick={() => query.refetch()}
        >
          Try again
        </Button>
        <Link href="/projects" className="text-sm underline">
          Back to My Projects
        </Link>
      </div>
    );
  return (
    <LaunchpadView
      data={query.data}
      busy={
        preferences.isPending ||
        complete.isPending ||
        report.isPending ||
        startOperation.isPending ||
        cancelOperation.isPending
      }
      onStartOperation={(input) => startOperation.mutate({ slug, ...input })}
      onCancelOperation={(jobId) => cancelOperation.mutate({ slug, jobId })}
      onPreferences={(input) => preferences.mutate({ slug, ...input })}
      onComplete={(taskId, done) =>
        complete.mutate({ slug, taskId, complete: done })
      }
      onImport={(input, scope) =>
        report.mutateAsync({ slug, scope, report: input })
      }
      releases={
        <>
          <SecurityBanner
            slug={slug}
            count={releases.data?.advisories.length ?? 0}
          />
          <details className="rounded-lg border p-4">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
              Release notes and upgrades
            </summary>
            <div className="mt-4 text-sm">
              <ReleaseNotesPanel slug={slug} />
              <Link
                href="/projects"
                className="mt-3 inline-flex min-h-11 items-center text-primary underline"
              >
                Manage project upgrades
              </Link>
            </div>
          </details>
        </>
      }
    />
  );
}
