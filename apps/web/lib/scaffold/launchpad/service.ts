import db from "@workspace/database/client";
import type { Prisma } from "@workspace/database/prisma";
import { TRPCError } from "@trpc/server";
import { projectDetailSelect } from "../project-selects";
import { stripSecrets } from "../secret-keys";
import { buildLaunchpad } from "./state";
import { renderWalkthroughMarkdown } from "./ai-state";
import { hydrateLaunchpadAI, launchpadAIView } from "./ai-runtime";
import type { LaunchpadProject, LaunchpadState } from "./types";

function decodeState(
  state: Prisma.JsonValue | undefined,
): LaunchpadState | null {
  return state ? (state as unknown as LaunchpadState) : null;
}

function asProject(
  project: Omit<LaunchpadProject, "config"> & { config: Prisma.JsonValue },
): LaunchpadProject {
  const config =
    project.config &&
    typeof project.config === "object" &&
    !Array.isArray(project.config)
      ? project.config
      : {};
  return { ...project, config: stripSecrets(config).config };
}

async function response(
  project: LaunchpadProject,
  state: LaunchpadState | null,
  userId: string,
  reader: Pick<Prisma.TransactionClient, "aiJobRun"> = db,
) {
  const hydrated = await hydrateLaunchpadAI(reader, userId, project, state);
  const journey = buildLaunchpad(project, hydrated);
  const resolved = hydrated ?? {
    mode: journey.mode,
    deployment: journey.deployment,
    manual: {},
    reports: {},
  };
  return {
    ...journey,
    ai: await launchpadAIView(reader, userId, project, resolved),
    markdown: renderWalkthroughMarkdown(project, resolved),
  };
}

export async function getLaunchpad(userId: string, slug: string) {
  const project = await db.projectConfig.findFirst({
    where: { userId, slug },
    select: projectDetailSelect,
  });
  if (!project)
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  const row = await db.projectLaunchpad.findUnique({
    where: { projectId: project.id },
  });
  return response(asProject(project), decodeState(row?.state), userId);
}

export async function getLaunchpadSummaries(userId: string) {
  const projects = await db.projectConfig.findMany({
    where: { userId },
    select: { ...projectDetailSelect, launchpad: { select: { state: true } } },
  });
  return projects.map((project) => ({
    slug: project.slug,
    ...buildLaunchpad(asProject(project), decodeState(project.launchpad?.state))
      .summary,
  }));
}

/** Serializable retries preserve separate task updates and reject stale selection imports. */
export async function changeLaunchpad(
  userId: string,
  slug: string,
  change: (
    project: LaunchpadProject,
    state: LaunchpadState | null,
    tx: Prisma.TransactionClient,
    projectId: string,
  ) => LaunchpadState | Promise<LaunchpadState>,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const project = await tx.projectConfig.findFirst({
            where: { userId, slug },
            select: projectDetailSelect,
          });
          if (!project)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found.",
            });
          const row = await tx.projectLaunchpad.findUnique({
            where: { projectId: project.id },
          });
          let state: LaunchpadState;
          try {
            const hydrated = await hydrateLaunchpadAI(
              tx,
              userId,
              asProject(project),
              decodeState(row?.state),
            );
            state = await change(asProject(project), hydrated, tx, project.id);
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                error instanceof Error
                  ? error.message
                  : "Invalid Launchpad update.",
            });
          }
          const data = { state: state as unknown as Prisma.InputJsonValue };
          await tx.projectLaunchpad.upsert({
            where: { projectId: project.id },
            create: { projectId: project.id, ...data },
            update: data,
          });
          return response(asProject(project), state, userId, tx);
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2034" && code !== "P2002") throw error;
      if (attempt === 2)
        throw new TRPCError({
          code: "CONFLICT",
          message: "The project changed while saving. Refresh and try again.",
        });
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: "Refresh and try again." });
}

/** Read only guide preferences, scoped to the owner, for per-download SETUP.md. */
export async function getLaunchpadPreferences(
  userId: string,
  identity: { projectId?: string | null; slug?: string },
  includeState = false,
) {
  if (!identity.projectId && !identity.slug) return undefined;
  const project = await db.projectConfig.findFirst({
    where: {
      userId,
      ...(identity.projectId
        ? { id: identity.projectId }
        : { slug: identity.slug }),
    },
    select: { id: true },
  });
  if (!project) return undefined;
  const row = await db.projectLaunchpad.findUnique({
    where: { projectId: project.id },
  });
  const state = decodeState(row?.state);
  return state
    ? {
        mode: state.mode,
        deployment: state.deployment,
        ...(includeState ? { launchpadState: state } : {}),
      }
    : undefined;
}
