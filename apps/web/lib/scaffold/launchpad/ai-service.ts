import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { dispatchAiJob } from "@/lib/ai-jobs/service";
import { inngest } from "@workspace/jobs/inngest";
import type { Prisma } from "@workspace/database/prisma";
import { changeLaunchpad } from "./service";
import { buildLaunchpad, defaultLaunchpadState } from "./state";
import { assertNoSecrets, briefAnswersSchema } from "./ai-schema";
import {
  acceptStageTasks,
  initialAIState,
  operationSourcePack,
} from "./ai-state";
import {
  currentAIFingerprint,
  LAUNCHPAD_AGENT,
  launchpadOperationRows,
  operationResult,
} from "./ai-runtime";
import type {
  BriefAnswers,
  LaunchpadOperationKind,
  SourcePack,
} from "./ai-types";
import type { StageId } from "./types";

const json = (value: unknown) => value as Prisma.InputJsonValue;
function bad(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export function saveLaunchpadBrief(
  userId: string,
  slug: string,
  answers: BriefAnswers,
  summary?: string,
) {
  const parsed = briefAnswersSchema.parse(answers);
  assertNoSecrets({ answers: parsed, summary });
  return changeLaunchpad(userId, slug, (_project, saved) => {
    const state = saved ?? defaultLaunchpadState();
    const ai = state.ai ?? initialAIState();
    const answeredFollowups = ai.brief.questions.length > 0;
    return {
      ...state,
      ai: {
        ...ai,
        brief: {
          revision: ai.brief.revision + 1,
          answers: parsed,
          summary: summary ?? "",
          confirmedRevision: null,
          questions: [],
          followupRound: answeredFollowups
            ? Math.min(2, ai.brief.followupRound + 1)
            : ai.brief.confirmedRevision !== null
              ? 0
              : ai.brief.followupRound,
        },
      },
    };
  });
}

export function confirmLaunchpadBrief(
  userId: string,
  slug: string,
  revision: number,
) {
  return changeLaunchpad(userId, slug, (_project, saved) => {
    const state = saved ?? defaultLaunchpadState();
    if (!state.ai || state.ai.brief.revision !== revision)
      bad("Your brief changed. Review and confirm its latest version.");
    if (!state.ai.brief.summary || state.ai.brief.questions.length)
      bad("Finish the interview and review the project brief first.");
    return {
      ...state,
      ai: {
        ...state.ai,
        brief: { ...state.ai.brief, confirmedRevision: revision },
      },
    };
  });
}

export const startOperationSchema = z
  .object({
    kind: z.enum(["interview", "generate", "help"]),
    stage: z.enum(["local", "mvp", "launch", "operate"]),
    taskId: z.string().min(1).max(100).optional(),
    message: z.string().trim().min(1).max(3000).optional(),
  })
  .strict();
type StartInput = {
  kind: LaunchpadOperationKind;
  stage: StageId;
  taskId?: string;
  message?: string;
};

export async function startLaunchpadOperation(
  userId: string,
  slug: string,
  options: StartInput,
) {
  const input = startOperationSchema.parse(options);
  assertNoSecrets(input.message);
  let jobId = "";
  const response = await changeLaunchpad(
    userId,
    slug,
    async (project, saved, tx) => {
      const state = saved ?? defaultLaunchpadState();
      const ai = structuredClone(state.ai ?? initialAIState());
      if (input.kind === "interview")
        bad(
          "Project interviews have been removed. Generate a stage checklist directly.",
        );
      if (input.kind === "generate")
        bad(
          "Checklists are now curated and ready to use. AI is available only for task help.",
        );
      const rows = await launchpadOperationRows(tx, userId, state);
      if (
        rows.some((row) => row.status === "PENDING" || row.status === "RUNNING")
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "A guide operation is already running for this project.",
        });
      const midnight = new Date();
      midnight.setUTCHours(0, 0, 0, 0);
      const used = await tx.aiJobRun.count({
        where: {
          userId,
          agentId: LAUNCHPAD_AGENT,
          createdAt: { gte: midnight },
        },
      });
      if (used >= 30)
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "You have used today's 30 guide operations. Try again tomorrow.",
        });
      const journey = buildLaunchpad(project, state);
      const sourcePack = operationSourcePack(project, state, input.stage, []);
      const selected =
        input.kind === "help"
          ? journey.tasks.find(
              (task) => task.id === input.taskId && task.stage === input.stage,
            )
          : undefined;
      if (input.kind === "help" && (!selected || !input.message))
        bad("Choose an applicable task and enter your question.");
      const task = selected
        ? {
            id: selected.id,
            anchorId: selected.anchorId ?? selected.id,
            stage: selected.stage,
            title: selected.title,
            purpose: selected.purpose,
            prerequisites: selected.prerequisites,
            presentations: selected.presentations,
            commands: selected.commands,
            acceptance: selected.acceptance,
            fixes: selected.fixes,
            links: selected.links,
            verification: selected.verification,
            signature: "source-task",
            ...(selected.checkId
              ? { checkId: selected.checkId, scope: selected.scope }
              : {}),
            ...(selected.sourceIds ? { sourceIds: selected.sourceIds } : {}),
          }
        : undefined;
      // Doctor evidence, raw config, IDs of other owners, and credentials never enter this payload.
      const payload = {
        kind: input.kind,
        sourcePack,
        ...(input.message ? { message: input.message } : {}),
        ...(task ? { task } : {}),
        history:
          input.kind === "help"
            ? ai.helpHistory
                .filter((entry) => entry.taskId === input.taskId)
                .slice(-5)
                .map(({ question, answer }) => ({ question, answer }))
            : [],
      };
      assertNoSecrets(payload);
      const row = await tx.aiJobRun.create({
        data: {
          userId,
          orgId: null,
          agentId: LAUNCHPAD_AGENT,
          status: "PENDING",
          input: json(payload),
        },
        select: { id: true },
      });
      jobId = row.id;
      return {
        ...state,
        ai: {
          ...ai,
          operations: [
            ...ai.operations,
            {
              jobId: row.id,
              kind: input.kind,
              stage: input.stage,
              ...(input.taskId ? { taskId: input.taskId } : {}),
              fingerprint: currentAIFingerprint(project, state),
              briefRevision: 0,
              createdAt: new Date().toISOString(),
            },
          ].slice(-30),
        },
      };
    },
  );
  try {
    await dispatchAiJob({ id: jobId, agentId: LAUNCHPAD_AGENT });
  } catch {
    /* Existing pending-job recovery retries dispatch. */
  }
  return response;
}

export async function cancelLaunchpadOperation(
  userId: string,
  slug: string,
  jobId: string,
) {
  const response = await changeLaunchpad(
    userId,
    slug,
    async (_project, saved, tx) => {
      if (!saved?.ai?.operations.some((operation) => operation.jobId === jobId))
        bad("Guide operation not found.");
      await tx.aiJobRun.updateMany({
        where: {
          id: jobId,
          userId,
          agentId: LAUNCHPAD_AGENT,
          status: { in: ["PENDING", "RUNNING"] },
        },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      return saved;
    },
  );
  try {
    await inngest.send({ name: "ai/job.cancelled", data: { jobId } });
  } catch {
    /* The durable cancelled row is authoritative. */
  }
  return response;
}

export function acceptLaunchpadDraft(
  userId: string,
  slug: string,
  jobId: string,
) {
  return changeLaunchpad(userId, slug, async (project, saved, tx) => {
    if (!saved?.ai) bad("Guide draft not found.");
    const reference = saved.ai.operations.find(
      (operation) => operation.jobId === jobId && operation.kind === "generate",
    );
    if (!reference || reference.discarded) bad("Guide draft not found.");
    if (reference.applied) return saved;
    if (reference.fingerprint !== currentAIFingerprint(project, saved))
      bad("The project settings changed. Generate a fresh checklist.");
    const row = (await launchpadOperationRows(tx, userId, saved)).find(
      (item) => item.id === jobId,
    );
    if (!row || row.status !== "SUCCEEDED")
      bad("Wait for the checklist to finish before accepting it.");
    const result = operationResult(row, reference);
    if (!result) bad("Guide draft not found.");
    const pack = (row.input as unknown as { sourcePack: SourcePack })
      .sourcePack;
    const next = acceptStageTasks(
      project,
      saved,
      reference.stage,
      result,
      pack,
      reference.fingerprint,
      buildLaunchpad(project, saved).tasks,
    );
    return {
      ...next,
      ai: {
        ...next.ai!,
        operations: next.ai!.operations.map((operation) =>
          operation.jobId === jobId
            ? { ...operation, applied: true }
            : operation,
        ),
      },
    };
  });
}

export function discardLaunchpadDraft(
  userId: string,
  slug: string,
  jobId: string,
) {
  return changeLaunchpad(userId, slug, (_project, saved) => {
    if (
      !saved?.ai?.operations.some(
        (operation) =>
          operation.jobId === jobId &&
          operation.kind === "generate" &&
          !operation.applied,
      )
    )
      bad("Guide draft not found.");
    return {
      ...saved,
      ai: {
        ...saved.ai,
        operations: saved.ai.operations.map((operation) =>
          operation.jobId === jobId
            ? { ...operation, discarded: true }
            : operation,
        ),
      },
    };
  });
}
