import type {
  CoverageRequirement,
  GeneratedTask,
  SourcePack,
} from "./ai-types";

type CoverageTask = Pick<GeneratedTask, "anchorId" | "title" | "instructions">;
export function coversRequirement(
  task: CoverageTask,
  requirement: CoverageRequirement,
) {
  if (requirement.kind === "account" && task.anchorId !== requirement.anchorId)
    return false;
  const text = (
    requirement.kind === "environment"
      ? task.instructions.join("\n")
      : [task.title, ...task.instructions].join("\n")
  ).toLowerCase();
  return requirement.terms.every((term) =>
    requirement.kind === "environment"
      ? new RegExp(
          "(?<![\\w])" +
            term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            "(?![\\w])",
          "i",
        ).test(text)
      : term.toLowerCase() === "ai"
        ? /\bai\b/.test(text)
        : text.includes(term.toLowerCase()),
  );
}

export function missingCoverage(tasks: CoverageTask[], pack: SourcePack) {
  const assigned = new Set<CoverageTask>();
  return (pack.coverageRequirements ?? []).filter((requirement) => {
    if (
      pack.completedAnchors.includes(requirement.anchorId) ||
      pack.completedRequirements?.includes(requirement.id)
    )
      return false;
    const task = tasks.find(
      (item) =>
        (requirement.kind !== "account" || !assigned.has(item)) &&
        coversRequirement(item, requirement),
    );
    if (!task) return true;
    if (requirement.kind === "account") assigned.add(task);
    return false;
  });
}

export function validateSetupCoverage(
  tasks: GeneratedTask[],
  pack: SourcePack,
) {
  const missing = missingCoverage(tasks, pack);
  if (missing.length)
    throw new Error(
      `AI omitted required setup coverage: ${missing
        .slice(0, 8)
        .map((item) => item.title)
        .join(", ")}.`,
    );
  for (const task of tasks) {
    const settings = (pack.coverageRequirements ?? []).filter(
      (item) =>
        item.kind === "environment" &&
        !item.optional &&
        coversRequirement(task, item),
    );
    if (settings.length > 4)
      throw new Error(
        "AI grouped too many environment settings into one task. Split the settings into smaller tasks.",
      );
  }
}
