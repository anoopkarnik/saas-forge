import type { Prisma } from "@workspace/database/prisma";
import type {
  LaunchpadAIView,
  LaunchpadAgentResult,
  OperationReference,
  OperationView,
  SourcePack,
} from "./ai-types";
import type { LaunchpadProject, LaunchpadState } from "./types";
import { initialAIState, stageNeedsRefresh } from "./ai-state";
import { validateAgentResult } from "./ai-schema";
import { projectFingerprint } from "./state";
import { SOURCE_PACK_VERSION } from "./source-pack";

type Reader = Pick<Prisma.TransactionClient, "aiJobRun">;
export const LAUNCHPAD_AGENT = "launchpad_v1";
const safeError =
  "The guide agent could not finish. Your active checklist is unchanged. Please retry.";
export const currentAIFingerprint = (
  project: LaunchpadProject,
  state: LaunchpadState,
) =>
  `${projectFingerprint(project)}|${state.deployment}|${SOURCE_PACK_VERSION}`;

export async function launchpadOperationRows(
  reader: Reader,
  userId: string,
  state: LaunchpadState,
) {
  if (!state.ai?.operations.length) return [];
  return reader.aiJobRun.findMany({
    where: {
      id: { in: state.ai.operations.map((operation) => operation.jobId) },
      userId,
      agentId: LAUNCHPAD_AGENT,
    },
    select: { id: true, status: true, result: true, input: true },
  });
}
type OperationRow = Awaited<ReturnType<typeof launchpadOperationRows>>[number];
export function operationResult(
  row: OperationRow,
  reference: OperationReference,
): LaunchpadAgentResult | null {
  if (row.status !== "SUCCEEDED") return null;
  const envelope = row.result as unknown as { output?: unknown } | null;
  const input = row.input as unknown as { sourcePack: SourcePack };
  return validateAgentResult(
    envelope?.output,
    input.sourcePack,
    reference.kind,
  );
}

/** Read projection only. A subsequent authorized mutation persists these folded results. */
export async function hydrateLaunchpadAI(
  reader: Reader,
  userId: string,
  project: LaunchpadProject,
  saved: LaunchpadState | null,
) {
  if (!saved?.ai) return saved;
  const rows = await launchpadOperationRows(reader, userId, saved);
  const ai = structuredClone(saved.ai);
  const fingerprint = currentAIFingerprint(project, saved);
  for (const reference of ai.operations) {
    if (
      reference.applied ||
      reference.discarded ||
      reference.fingerprint !== fingerprint
    )
      continue;
    const row = rows.find((item) => item.id === reference.jobId);
    if (!row) continue;
    let result: LaunchpadAgentResult | null;
    try {
      result = operationResult(row, reference);
    } catch {
      continue;
    }
    if (!result || result.kind === "generate") continue;
    if (result.kind === "interview") {
      ai.brief.summary = result.summary;
      ai.brief.questions = ai.brief.followupRound < 2 ? result.questions : [];
    } else {
      const input = row.input as unknown as { message?: string };
      ai.helpHistory.push({
        taskId: reference.taskId!,
        question: input.message ?? "",
        answer: result.answer,
        sourceIds: result.sourceIds,
        at: reference.createdAt,
      });
      ai.helpHistory = ai.helpHistory.slice(-20);
    }
    reference.applied = true;
  }
  return { ...saved, ai };
}

export async function launchpadAIView(
  reader: Reader,
  userId: string,
  project: LaunchpadProject,
  state: LaunchpadState,
): Promise<LaunchpadAIView> {
  const rows = await launchpadOperationRows(reader, userId, state);
  const fingerprint = currentAIFingerprint(project, state);
  const ai = state.ai ?? initialAIState();
  const operations: OperationView[] = ai.operations
    .filter(
      (reference) =>
        reference.kind !== "interview" ||
        rows.some(
          (row) =>
            row.id === reference.jobId &&
            (row.status === "PENDING" || row.status === "RUNNING"),
        ),
    )
    .slice(-10)
    .map((reference) => {
      const row = rows.find((item) => item.id === reference.jobId);
      let result: LaunchpadAgentResult | null = null;
      let status: OperationView["status"] = row?.status ?? "FAILED";
      if (row)
        try {
          result = operationResult(row, reference);
        } catch {
          status = "FAILED";
        }
      return {
        ...reference,
        ...(result?.kind === "generate" && row
          ? {
              commands: (row.input as unknown as { sourcePack: SourcePack })
                .sourcePack.commands,
            }
          : {}),
        status,
        result,
        error: status === "FAILED" ? safeError : null,
        stale: reference.fingerprint !== fingerprint,
      };
    });
  return {
    brief: null,
    operations,
    helpHistory: ai.helpHistory,
    stageStale: stageNeedsRefresh(project, state, fingerprint),
  };
}
