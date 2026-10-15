import type { GeneratedTask, SourcePack } from "../launchpad/ai-types";

export function completeDraft(pack: SourcePack): {
  kind: "generate";
  tasks: GeneratedTask[];
} {
  const tasks: GeneratedTask[] = [];
  const add = (anchorId: string, title: string, instructions: string[]) =>
    tasks.push({
      key: `step-${tasks.length}`,
      anchorId,
      title,
      instructions,
      purpose: "Complete one useful action.",
      technicalDetails: [],
      commandIds: [],
      filePaths: [],
      acceptance: ["The expected outcome is visible."],
      verification: "Check the visible result.",
      fixes: ["Review the supplied guidance."],
      sourceIds: pack.anchors.find((anchor) => anchor.id === anchorId)!
        .sourceIds,
      dependencies: tasks.length ? [`step-${tasks.length - 1}`] : [],
    });
  for (const anchor of pack.anchors) {
    if (
      pack.serverCheckAnchors?.includes(anchor.id) ||
      pack.completedAnchors.includes(anchor.id)
    )
      continue;
    const requirements = (pack.coverageRequirements ?? []).filter(
      (item) =>
        item.anchorId === anchor.id &&
        !pack.completedRequirements?.includes(item.id),
    );
    for (const account of requirements.filter(
      (item) => item.kind === "account",
    ))
      add(anchor.id, `Connect ${account.title}`, [
        `Open the ${account.title} service dashboard.`,
        "Connect your existing account and review its setup guidance.",
      ]);
    const settings = requirements.filter((item) => item.kind === "environment");
    for (let index = 0; index < settings.length; index += 3)
      add(anchor.id, `Configure settings ${index}`, [
        `Fill ${settings
          .slice(index, index + 3)
          .map((item) => item.title)
          .join(", ")} in your environment file.`,
        "Keep credentials private and save the file.",
      ]);
    if (!requirements.length)
      add(anchor.id, `Complete ${anchor.title}`, [
        "Follow the source guidance for this action.",
      ]);
  }
  return { kind: "generate", tasks };
}
