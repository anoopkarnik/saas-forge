import { buildLaunchpadTasks } from "./catalog";
import { validateAgentResult } from "./ai-schema";
import { buildSourcePack, SOURCE_PACK_VERSION } from "./source-pack";
import { coversRequirement } from "./coverage";
import { buildCuratedTasks } from "./curated";
import type {
  GuidedTask,
  LaunchpadAIState,
  LaunchpadProject,
  LaunchpadState,
  SourcePack,
  StageId,
} from "./types";

export function initialAIState(): LaunchpadAIState {
  return {
    version: 2,
    brief: {
      revision: 0,
      answers: { audience: "", journey: "", setup: "", os: "", launch: "" },
      summary: "",
      confirmedRevision: null,
      followupRound: 0,
      questions: [],
    },
    stages: {},
    operations: [],
    helpHistory: [],
  };
}

export function walkthroughTasks(
  project: LaunchpadProject,
  state: LaunchpadState,
) {
  const anchors = buildLaunchpadTasks(project, state.deployment);
  const stages: StageId[] = ["local", "mvp", "launch", "operate"];
  return stages.flatMap((stage) => {
    const applicable = anchors.filter((anchor) => anchor.stage === stage);
    const children =
      state.ai?.stages[stage]?.tasks.filter((task) =>
        applicable.some(
          (anchor) =>
            anchor.id === task.anchorId &&
            anchor.signature === task.anchorSignature,
        ),
      ) ?? [];
    const covered = new Set(
      children
        .filter((task) => {
          const anchor = applicable.find((item) => item.id === task.anchorId);
          return (
            !anchor?.checkId ||
            (task.checkId === anchor.checkId && task.scope === anchor.scope)
          );
        })
        .map((task) => task.anchorId),
    );
    // Preserve the agent's dependency order instead of regrouping children by anchor.
    return [
      ...children,
      ...applicable
        .filter((anchor) => !covered.has(anchor.id))
        .map((anchor) => {
          if (!anchor.checkId || !state.ai?.stages[stage]) return anchor;
          const instructions = [
            `Import a doctor report for the ${anchor.scope === "production" ? "Production" : "Local"} environment if you have not already done so. Use the Import report action above.`,
            "Check this task's status for Passed imported check. For Warning or Failed, follow the fixes and import a new report after correcting the issue.",
          ];
          return {
            ...anchor,
            presentations: {
              founder: instructions,
              builder: instructions,
              developer: [
                anchor.verification,
                "A connection probe does not verify complete app workflows, backups or releases.",
              ],
            },
          };
        }),
    ];
  });
}

export function stageNeedsRefresh(
  project: LaunchpadProject,
  state: LaunchpadState,
  fingerprint: string,
) {
  return Object.fromEntries(
    Object.entries(state.ai?.stages ?? {}).map(([stage, accepted]) => [
      stage,
      accepted.fingerprint !== fingerprint ||
        accepted.sourceVersion !== SOURCE_PACK_VERSION ||
        accepted.tasks.some(
          (task) =>
            !buildLaunchpadTasks(project, state.deployment).some(
              (anchor) =>
                anchor.id === task.anchorId &&
                anchor.signature === task.anchorSignature,
            ),
        ),
    ]),
  );
}

/** Curated guidance is immediate; retain applicable earlier work as explicit completion. */
export function activeWalkthroughTasks(
  project: LaunchpadProject,
  state: LaunchpadState,
) {
  const curated = buildCuratedTasks(project, state.deployment);
  const completed = walkthroughTasks(project, state).filter(
    (task) => state.manual[task.id] === task.signature,
  );
  const preserved = completed.filter(
    (task) => !curated.some((current) => current.id === task.id),
  );
  return (["local", "mvp", "launch", "operate"] as const).flatMap((stage) => [
    ...curated.filter(
      (task) =>
        task.stage === stage &&
        !preserved.some(
          (old) =>
            old.checkId &&
            old.checkId === task.checkId &&
            old.scope === task.scope,
        ),
    ),
    ...preserved
      .filter((task) => task.stage === stage)
      .map((task) => ({
        ...task,
        title: `Earlier completed step: ${task.title}`,
      })),
  ]);
}

export function acceptStageTasks(
  project: LaunchpadProject,
  state: LaunchpadState,
  stage: StageId,
  value: unknown,
  pack: SourcePack,
  fingerprint: string,
  completed: Array<{ id: string; status: string }>,
): LaunchpadState {
  const result = validateAgentResult(value, pack, "generate");
  if (result.kind !== "generate")
    throw new Error("Expected a checklist draft.");
  const ai = state.ai ?? initialAIState();
  const anchors = new Map(
    buildLaunchpadTasks(project, state.deployment).map((anchor) => [
      anchor.id,
      anchor,
    ]),
  );
  const previous = walkthroughTasks(project, state).filter(
    (task) => task.stage === stage,
  );
  const done = new Set(
    completed
      .filter((task) => task.status === "manual" || task.status === "passed")
      .map((task) => task.id),
  );
  const frozen = previous.filter((task) => done.has(task.id));
  const commandMap = new Map(
    pack.commands.map((command) => [command.id, command]),
  );
  const ids = new Map(
    result.tasks.map((task) => [task.key, `guided-${crypto.randomUUID()}`]),
  );
  const generated: GuidedTask[] = result.tasks.map((item) => {
    const anchor = anchors.get(item.anchorId)!;
    const sourceLinks = pack.sources
      .filter((source) => item.sourceIds.includes(source.id) && source.url)
      .map((source) => ({ label: source.label, url: source.url! }));
    const instructions = [
      ...item.instructions,
      ...item.filePaths
        .filter(
          (path) => !item.instructions.some((line) => line.includes(path)),
        )
        .map((path) => `Relevant file: ${path}`),
    ];
    const task = {
      id: ids.get(item.key)!,
      anchorId: anchor.id,
      anchorSignature: anchor.signature,
      generated: true as const,
      sourceIds: item.sourceIds,
      stage,
      title: item.title,
      purpose: item.purpose,
      prerequisites: item.dependencies.map(
        (key) => result.tasks.find((task) => task.key === key)!.title,
      ),
      presentations: {
        founder: instructions,
        builder: instructions,
        developer: item.technicalDetails.length
          ? item.technicalDetails
          : instructions,
      },
      commands: item.commandIds.map((id) => {
        const command = commandMap.get(id)!;
        return { label: command.label, command: command.command };
      }),
      acceptance: item.acceptance,
      fixes: item.fixes,
      links: [...anchor.links, ...sourceLinks].filter(
        (link, index, links) =>
          links.findIndex((item) => item.url === link.url) === index,
      ),
      verification: item.verification,
    };
    return { ...task, signature: JSON.stringify({ ...task, id: undefined }) };
  });
  const preserved: GuidedTask[] = frozen.map((task) =>
    "anchorSignature" in task
      ? (task as GuidedTask)
      : {
          ...task,
          anchorId: task.id,
          anchorSignature: task.signature,
          sourceIds: [`source:${task.id}`],
          generated: true,
          signature: task.signature,
        },
  );
  // Credential probes cannot prove an arbitrary AI-written action. Keep automated
  // evidence on a separate server-authored check with its original scope.
  const checks: GuidedTask[] = [...anchors.values()]
    .filter(
      (anchor) =>
        anchor.stage === stage &&
        anchor.checkId &&
        result.tasks.some((task) => task.anchorId === anchor.id) &&
        !preserved.some((task) => task.id === `guided-check:${anchor.id}`),
    )
    .map((anchor) => ({
      ...anchor,
      id: `guided-check:${anchor.id}`,
      anchorId: anchor.id,
      anchorSignature: anchor.signature,
      sourceIds: [`source:${anchor.id}`],
      generated: true,
      signature: `verification:${anchor.signature}`,
    }));
  return {
    ...state,
    ai: {
      ...ai,
      stages: {
        ...ai.stages,
        [stage]: {
          fingerprint,
          briefRevision: 0,
          sourceVersion: pack.version,
          acceptedAt: new Date().toISOString(),
          tasks: [...preserved, ...generated, ...checks],
        },
      },
    },
  };
}

/** An unaccepted draft can never alter the exported or visible walkthrough. */
export function renderWalkthroughMarkdown(
  project: LaunchpadProject,
  state: LaunchpadState,
) {
  const tasks = activeWalkthroughTasks(project, state);
  const stages: Array<{ id: StageId; title: string }> = [
    { id: "local", title: "Run locally" },
    { id: "mvp", title: "Build your MVP" },
    { id: "launch", title: "Launch" },
    { id: "operate", title: "Operate" },
  ];
  const lines = [
    "## Project Launchpad",
    "",
    `Web deployment: ${state.deployment} · Starter: v${project.templateVersion}`,
    "",
    "Progress is optional. Imported reports are user-supplied evidence; a local pass does not verify production.",
    "",
  ];
  for (const stage of stages) {
    lines.push(`### ${stage.title}`, "");
    for (const task of tasks.filter((task) => task.stage === stage.id)) {
      lines.push(`#### ${task.title}`, "", task.purpose, "");
      if (task.prerequisites.length)
        lines.push(`Prerequisites: ${task.prerequisites.join("; ")}`, "");
      lines.push(...task.presentations.builder.map((line) => `- ${line}`), "");
      for (const command of task.commands)
        lines.push(command.label, "", "```bash", command.command, "```", "");
      lines.push(
        "Expected result:",
        ...task.acceptance.map((item) => `- ${item}`),
        "",
        `Verification: ${task.verification}`,
        "",
        "Common fixes:",
        ...task.fixes.map((item) => `- ${item}`),
        "",
      );
      if (
        (task.generated || task.id.startsWith("curated:")) &&
        task.presentations.developer.length
      )
        lines.push(
          "Technical details:",
          ...task.presentations.developer.map((item) => `- ${item}`),
          "",
        );
      for (const link of task.links)
        lines.push(`- [${link.label}](${link.url})`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function operationSourcePack(
  project: LaunchpadProject,
  state: LaunchpadState,
  stage: StageId,
  completed: Array<{ id: string; status: string }>,
) {
  const done = new Set(
    completed
      .filter((task) => task.status === "manual" || task.status === "passed")
      .map((task) => task.id),
  );
  const current = walkthroughTasks(project, state);
  const pack = buildSourcePack(project, state.deployment, stage);
  const finished = current.filter(
    (task) => task.stage === stage && done.has(task.id),
  );
  pack.completedRequirements = (pack.coverageRequirements ?? [])
    .filter((requirement) =>
      finished.some(
        (task) =>
          // Legacy manual completion explicitly covers the original catalog task.
          (!task.generated && task.id === requirement.anchorId) ||
          coversRequirement(
            {
              anchorId: task.anchorId ?? task.id,
              title: task.title,
              instructions: task.presentations.builder,
            },
            requirement,
          ),
      ),
    )
    .map((requirement) => requirement.id);
  const completedAnchors = buildLaunchpadTasks(project, state.deployment)
    .filter(
      (anchor) =>
        anchor.stage === stage &&
        current
          .filter((task) => (task.anchorId ?? task.id) === anchor.id)
          .every((task) => done.has(task.id)) &&
        (pack.coverageRequirements ?? [])
          .filter((requirement) => requirement.anchorId === anchor.id)
          .every((requirement) =>
            pack.completedRequirements!.includes(requirement.id),
          ),
    )
    .map((anchor) => anchor.id);
  pack.completedAnchors = completedAnchors;
  pack.completedTasks = current
    .filter(
      (task) =>
        task.stage === stage &&
        done.has(task.id) &&
        !completedAnchors.includes(task.anchorId ?? task.id),
    )
    .slice(-80)
    .map((task) => ({
      anchorId: task.anchorId ?? task.id,
      title: task.title,
      instructions: task.presentations.builder
        .slice(0, 1)
        .map((instruction) => instruction.slice(0, 500)),
    }));
  return pack;
}
