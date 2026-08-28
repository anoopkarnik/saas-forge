import type { Prisma } from "@prisma/client";
import db from "@workspace/database/client";
import {
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { stripSecrets } from "@/lib/scaffold/secret-keys";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import { projectDetailSelect } from "@/lib/scaffold/project-selects";

/**
 * Framework-agnostic create/update for saved project configs, shared by the v1
 * REST routes. Platform-only (excluded from the boilerplate). `validateSelectedModules`
 * throws `InvalidScaffoldModuleError` on bad modules — callers map it to a 400.
 *
 * NOTE: `projectProcedures.ts` (tRPC) keeps its own equivalent create/update for
 * now; dedupe both onto this module during the typecheck pass.
 */

export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

export async function uniqueSlug(userId: string, base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
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

export type CreateProjectInput = {
  name: string;
  productTypeId?: string | null;
  tierId: string;
  versionId: string;
  platforms: string[];
  modules: string[];
  config: Record<string, unknown>;
};

export async function createProject(userId: string, input: CreateProjectInput) {
  const modules = validateSelectedModules(input.modules);
  const { config, strippedKeys } = stripSecrets(input.config);
  const slug = await uniqueSlug(userId, slugify(input.name));

  const project = await db.projectConfig.create({
    data: {
      userId,
      name: input.name,
      slug,
      productTypeId: input.productTypeId ?? null,
      tierId: input.tierId,
      versionId: input.versionId,
      platforms: input.platforms,
      modules,
      config: config as Prisma.InputJsonValue,
      templateVersion: getTemplateVersion(),
    },
    select: projectDetailSelect,
  });

  return { project, strippedKeys, slug };
}

export type UpdateProjectPatch = {
  name?: string;
  productTypeId?: string | null;
  tierId?: string;
  versionId?: string;
  platforms?: string[];
  modules?: string[];
  config?: Record<string, unknown>;
};

/** Returns the updated project, or `null` if it doesn't exist / isn't owned. */
export async function updateProject(
  userId: string,
  slug: string,
  patch: UpdateProjectPatch,
) {
  const existing = await db.projectConfig.findFirst({
    where: { userId, slug },
    select: { id: true },
  });
  if (!existing) return null;

  const data: Prisma.ProjectConfigUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.productTypeId !== undefined) data.productTypeId = patch.productTypeId;
  if (patch.tierId !== undefined) data.tierId = patch.tierId;
  if (patch.versionId !== undefined) data.versionId = patch.versionId;
  if (patch.platforms !== undefined) data.platforms = patch.platforms;
  if (patch.modules !== undefined) {
    data.modules = validateSelectedModules(patch.modules) as ScaffoldModuleId[];
  }
  if (patch.config !== undefined) {
    data.config = stripSecrets(patch.config).config as Prisma.InputJsonValue;
  }

  return db.projectConfig.update({
    where: { id: existing.id },
    data,
    select: projectDetailSelect,
  });
}
