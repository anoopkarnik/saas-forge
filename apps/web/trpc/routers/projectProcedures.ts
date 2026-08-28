import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import db from "@workspace/database/client";
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
import { stripSecrets } from "@/lib/scaffold/secret-keys";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import { generateSetupGuide } from "@/lib/scaffold/setup-guide";

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
// Selects
// ---------------------------------------------------------------------------

const listSelect = {
  id: true,
  name: true,
  slug: true,
  productTypeId: true,
  tierId: true,
  versionId: true,
  platforms: true,
  modules: true,
  templateVersion: true,
  lastBuiltAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const detailSelect = {
  ...listSelect,
  config: true,
  lastBuiltHash: true,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

async function uniqueSlug(userId: string, base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  // Bounded loop; @@unique([userId, slug]) is the final guard.
  while (
    await db.projectConfig.findFirst({
      where: { userId, slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

function safeValidateModules(modules: string[]): ScaffoldModuleId[] {
  try {
    return validateSelectedModules(modules);
  } catch (error) {
    if (
      error instanceof InvalidScaffoldModuleError ||
      (error as { name?: string })?.name === "InvalidScaffoldModuleError"
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: (error as Error).message,
      });
    }
    throw error;
  }
}

function tierOrder(tierId: string): number {
  const parsed = Number.parseInt(String(tierId).replace(/^tier-/, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

type BuildableProject = {
  modules: string[];
  tierId: string;
  versionId: string;
  platforms: string[];
  templateVersion: string;
  config: unknown;
};

function computeBuildHash(project: BuildableProject): string {
  const payload = JSON.stringify({
    modules: [...project.modules].sort(),
    tierId: project.tierId,
    versionId: project.versionId,
    platforms: [...project.platforms].sort(),
    templateVersion: project.templateVersion,
    config: project.config,
  });
  return createHash("sha256").update(payload).digest("hex");
}

async function getOwnedProject(userId: string, slug: string) {
  const project = await db.projectConfig.findFirst({
    where: { userId, slug },
    select: detailSelect,
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return project;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.projectConfig.findMany({
      where: { userId: ctx.session.user.id },
      select: listSelect,
      orderBy: { updatedAt: "desc" },
    });
  }),

  get: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
    return getOwnedProject(ctx.session.user.id, input.slug);
  }),

  save: protectedProcedure.input(saveInput).mutation(async ({ ctx, input }) => {
    const modules = safeValidateModules(input.modules);
    const { config, strippedKeys } = stripSecrets(input.config);
    const slug = await uniqueSlug(ctx.session.user.id, slugify(input.name));

    const project = await db.projectConfig.create({
      data: {
        userId: ctx.session.user.id,
        name: input.name,
        slug,
        productTypeId: input.productTypeId ?? null,
        tierId: input.tierId,
        versionId: input.versionId,
        platforms: input.platforms,
        modules,
        config,
        templateVersion: getTemplateVersion(),
      },
      select: detailSelect,
    });

    logger.info(
      `project.saved ${JSON.stringify({
        userId: ctx.session.user.id,
        projectId: project.id,
        slug,
        modules,
        strippedSecretCount: strippedKeys.length,
      })}`,
    );

    return { project, strippedKeys };
  }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.projectConfig.findFirst({
        where: { userId: ctx.session.user.id, slug: input.slug },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }

      const data: Prisma.ProjectConfigUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.productTypeId !== undefined)
        data.productTypeId = input.productTypeId;
      if (input.tierId !== undefined) data.tierId = input.tierId;
      if (input.versionId !== undefined) data.versionId = input.versionId;
      if (input.platforms !== undefined) data.platforms = input.platforms;
      if (input.modules !== undefined)
        data.modules = safeValidateModules(input.modules);
      if (input.config !== undefined)
        data.config = stripSecrets(input.config).config;

      const project = await db.projectConfig.update({
        where: { id: existing.id },
        data,
        select: detailSelect,
      });

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
      const source = await getOwnedProject(ctx.session.user.id, input.slug);
      const name = input.name ?? `${source.name} copy`;
      const slug = await uniqueSlug(ctx.session.user.id, slugify(name));

      const project = await db.projectConfig.create({
        data: {
          userId: ctx.session.user.id,
          name,
          slug,
          productTypeId: source.productTypeId,
          tierId: source.tierId,
          versionId: source.versionId,
          platforms: source.platforms,
          modules: source.modules,
          config: source.config as Prisma.InputJsonValue,
          templateVersion: getTemplateVersion(),
        },
        select: detailSelect,
      });

      return project;
    }),

  delete: protectedProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    const result = await db.projectConfig.deleteMany({
      where: { userId: ctx.session.user.id, slug: input.slug },
    });
    if (result.count === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
    }
    logger.info(
      `project.deleted ${JSON.stringify({
        userId: ctx.session.user.id,
        slug: input.slug,
      })}`,
    );
    return { deleted: result.count };
  }),

  estimateDownload: protectedProcedure
    .input(slugInput)
    .query(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.session.user.id, input.slug);
      const modules = safeValidateModules(project.modules);
      const pricing = calculateScaffoldCredits(modules);
      const alreadyBuilt =
        !!project.lastBuiltHash &&
        project.lastBuiltHash === computeBuildHash(project);

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
        ? safeValidateModules(input.targetModules)
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
