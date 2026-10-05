import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import {
  validateSelectedModules,
  type ScaffoldModuleId,
} from "@/lib/scaffold-modules";
import { stripSecrets } from "@/lib/scaffold/secret-keys";
import { getTemplateVersion } from "@/lib/scaffold/template-version";
import {
  projectDetailSelect,
  projectListSelect,
} from "@/lib/scaffold/project-selects";

/**
 * Application service for saved project configs — the only module that touches
 * `db.projectConfig`. Shared by the tRPC `projectRouter`, the v1 REST routes and
 * the scaffold upgrade route. Platform-only (excluded from the boilerplate).
 *
 * Framework-agnostic: "not found / not owned" is returned as `null`, and
 * `validateSelectedModules` throws `InvalidScaffoldModuleError` on bad modules —
 * callers map both to their own transport errors (TRPCError, HTTP 400/404).
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

export function listProjects(userId: string) {
  return db.projectConfig.findMany({
    where: { userId },
    select: projectListSelect,
    orderBy: { updatedAt: "desc" },
  });
}

/** Returns the project, or `null` if it doesn't exist / isn't owned. */
export function getProject(userId: string, slug: string) {
  return db.projectConfig.findFirst({
    where: { userId, slug },
    select: projectDetailSelect,
  });
}

/** Returns the copy, or `null` if the source doesn't exist / isn't owned. */
export async function duplicateProject(
  userId: string,
  sourceSlug: string,
  name?: string,
) {
  const source = await getProject(userId, sourceSlug);
  if (!source) return null;

  const copyName = name ?? `${source.name} copy`;
  const slug = await uniqueSlug(userId, slugify(copyName));

  return db.projectConfig.create({
    data: {
      userId,
      name: copyName,
      slug,
      productTypeId: source.productTypeId,
      tierId: source.tierId,
      versionId: source.versionId,
      platforms: source.platforms,
      modules: source.modules,
      config: source.config as Prisma.InputJsonValue,
      templateVersion: getTemplateVersion(),
    },
    select: projectDetailSelect,
  });
}

/**
 * Best-effort: stamps a fresh download so an unchanged re-download is free.
 * Only touches the build stamp, never the config, so a concurrent edit wins.
 */
export function markProjectBuilt(projectId: string, lastBuiltHash: string): void {
  void db.projectConfig
    .update({
      where: { id: projectId },
      data: { lastBuiltHash, lastBuiltAt: new Date() },
    })
    .catch(() => {});
}

export type ProjectUpgrade = {
  modules: string[];
  tierId: string;
  versionId: string;
  templateVersion: string;
  lastBuiltHash: string;
};

/** Best-effort: persists the upgraded inputs plus the build stamp. */
export function markProjectUpgraded(projectId: string, upgrade: ProjectUpgrade): void {
  void db.projectConfig
    .update({
      where: { id: projectId },
      data: { ...upgrade, lastBuiltAt: new Date() },
    })
    .catch(() => {});
}

/** The projects of several owners, for release emails. */
export function listProjectsForOwners(userIds: string[]) {
  return db.projectConfig.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, name: true, modules: true, templateVersion: true },
  });
}

/** Returns the number of deleted rows (0 if it doesn't exist / isn't owned). */
export async function deleteProject(userId: string, slug: string) {
  const result = await db.projectConfig.deleteMany({ where: { userId, slug } });
  return result.count;
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
