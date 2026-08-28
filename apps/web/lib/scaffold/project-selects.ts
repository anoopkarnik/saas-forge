/**
 * Shared Prisma select shapes for ProjectConfig, used by the v1 REST routes and
 * the scaffold service. Platform-only (excluded from the boilerplate).
 */
export const projectListSelect = {
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

export const projectDetailSelect = {
  ...projectListSelect,
  config: true,
  lastBuiltHash: true,
} as const;
