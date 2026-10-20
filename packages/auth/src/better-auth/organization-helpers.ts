// Pure organization helpers — no database or Better Auth imports, so they are
// safe to use from tRPC middleware, tests, and client code alike.

export const ORG_ROLES = ["owner", "admin", "member", "viewer"] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}

export function hasOrgRole(role: string, min: OrgRole): boolean {
  return isOrgRole(role) && ROLE_RANK[role] >= ROLE_RANK[min];
}

export function buildWorkspaceSlug(base: string, suffix: string): string {
  const slug = base
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "workspace"}-${suffix}`;
}

export function personalWorkspaceName(
  name: string | null | undefined,
  email: string,
): string {
  const owner = name?.trim() || email.split("@")[0] || "My";
  return `${owner}'s Workspace`;
}
