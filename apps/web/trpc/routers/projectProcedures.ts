import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logger } from "@workspace/observability/winston-logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  InvalidScaffoldModuleError,
  calculateModulesCredits,
  calculateScaffoldCredits,
  getTierUpgradeCreditsPerStep,
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import {
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  listProjects,
  updateProject,
} from "@/lib/scaffold/project-service";
import { computeBuildHash, tierOrder } from "@/lib/scaffold/project-rules";
import { generateSetupGuide } from "@/lib/scaffold/setup-guide";
import { ownsBuild, scaffoldBuildKey } from "@/lib/scaffold/service";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const configSchema = z.record(z.string(), z.any());

const saveInput = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80),
  productTypeId: z.string().trim().min(1).optional(),
  tierId: z.string().trim().min(1).default("tier-1"),
  versionId: z.string().trim().min(1).default("balanced"),
  platforms: z.array(z.string()).min(1).default(["web"]),
  modules: z.array(z.string()).default([]),
  config: configSchema.default({}),
});

const updateInput = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  productTypeId: z.string().trim().min(1).nullable().optional(),
  tierId: z.string().trim().min(1).optional(),
  versionId: z.string().trim().min(1).optional(),
  platforms: z.array(z.string()).min(1).optional(),
  modules: z.array(z.string()).optional(),
  config: configSchema.optional(),
});

const slugInput = z.object({ slug: z.string().min(1) });

const upgradeEstimateInput = z.object({
  slug: z.string().min(1),
  targetModules: z.array(z.string()).optional(),
  targetTierId: z.string().trim().min(1).optional(),
  targetVersionId: z.string().trim().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isInvalidModuleError(error: unknown): boolean {
  return (
    error instanceof InvalidScaffoldModuleError ||
    (error as { name?: string })?.name === "InvalidScaffoldModuleError"
  );
}

/** Maps the service's InvalidScaffoldModuleError to a tRPC BAD_REQUEST. */
async function withModuleValidation<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isInvalidModuleError(error)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: (error as Error).message,
      });
    }
    throw error;
  }
}

function safeValidateModules(modules: string[]): Promise<ScaffoldModuleId[]> {
  return withModuleValidation(() => validateSelectedModules(modules));
}

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
}

async function getOwnedProject(userId: string, slug: string) {
  const project = await getProject(userId, slug);
  if (!project) throw notFound();
  return project;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return listProjects(ctx.session.user.id);
  }),

  get: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
    return getOwnedProject(ctx.session.user.id, input.slug);
  }),

  save: protectedProcedure.input(saveInput).mutation(async ({ ctx, input }) => {
    const { project, strippedKeys, slug } = await withModuleValidation(() =>
      createProject(ctx.session.user.id, input),
    );

    logger.info(
      `project.saved ${JSON.stringify({
        userId: ctx.session.user.id,
        projectId: project.id,
        slug,
        modules: project.modules,
        strippedSecretCount: strippedKeys.length,
      })}`,
    );

    return { project, strippedKeys };
  }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { slug, ...patch } = input;
      const project = await withModuleValidation(() =>
        updateProject(ctx.session.user.id, slug, patch),
      );
      if (!project) throw notFound();

      logger.info(
        `project.updated ${JSON.stringify({
          userId: ctx.session.user.id,
          projectId: project.id,
        })}`,
      );

      return project;
    }),

  duplicate: protectedProcedure
    .input(z.object({ slug: z.string().min(1), name: z.string().trim().min(1).max(80).optional() }))
    .mutation(async ({ ctx, input }) => {
      const project = await duplicateProject(
        ctx.session.user.id,
        input.slug,
        input.name,
      );
      if (!project) throw notFound();

      return project;
    }),

  delete: protectedProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    const deleted = await deleteProject(ctx.session.user.id, input.slug);
    if (deleted === 0) throw notFound();
    logger.info(
      `project.deleted ${JSON.stringify({
        userId: ctx.session.user.id,
        slug: input.slug,
      })}`,
    );
    return { deleted };
  }),

  estimateDownload: protectedProcedure
    .input(slugInput)
    .query(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.session.user.id, input.slug);
      const modules = await safeValidateModules(project.modules);
      const pricing = calculateScaffoldCredits(modules);
      // Free when unchanged since the last API build, or when the user already
      // owns this exact build (same modules, platforms and starter).
      const alreadyBuilt =
        (!!project.lastBuiltHash && project.lastBuiltHash === computeBuildHash(project)) ||
        (await ownsBuild(ctx.session.user.id, scaffoldBuildKey(modules, project.platforms)));

      return {
        credits: alreadyBuilt ? 0 : pricing.totalCredits,
        fullCredits: pricing.totalCredits,
        alreadyBuilt,
        breakdown: pricing,
      };
    }),

  estimateUpgrade: protectedProcedure
    .input(upgradeEstimateInput)
    .query(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.session.user.id, input.slug);
      const owned = new Set(project.modules);
      const target = input.targetModules
        ? await safeValidateModules(input.targetModules)
        : (project.modules as ScaffoldModuleId[]);
      const targetSet = new Set<string>(target);

      const addedModules = target.filter((m) => !owned.has(m));
      const removedModules = project.modules.filter((m) => !targetSet.has(m));
      const moduleCredits = calculateModulesCredits(
        addedModules as ScaffoldModuleId[],
      );

      const tierSteps = Math.max(
        0,
        tierOrder(input.targetTierId ?? project.tierId) -
          tierOrder(project.tierId),
      );
      const tierCredits = tierSteps * getTierUpgradeCreditsPerStep();

      return {
        deltaCredits: moduleCredits + tierCredits,
        moduleCredits,
        tierCredits,
        tierSteps,
        addedModules,
        removedModules,
      };
    }),

  setupGuide: protectedProcedure
    .input(slugInput)
    .query(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.session.user.id, input.slug);
      return generateSetupGuide({
        name: project.name,
        productTypeId: project.productTypeId,
        tierId: project.tierId,
        versionId: project.versionId,
        modules: project.modules as ScaffoldModuleId[],
        config: (project.config ?? {}) as Record<string, unknown>,
      });
    }),
});
