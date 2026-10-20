import { describe, it, expect } from "vitest";
import {
  buildWorkspaceSlug,
  hasOrgRole,
  isOrgRole,
  personalWorkspaceName,
} from "./organization-helpers";

describe("hasOrgRole", () => {
  it("allows a higher role to satisfy a lower requirement", () => {
    expect(hasOrgRole("admin", "member")).toBe(true);
    expect(hasOrgRole("owner", "admin")).toBe(true);
  });

  it("allows an equal role", () => {
    expect(hasOrgRole("member", "member")).toBe(true);
  });

  it("rejects a lower role", () => {
    expect(hasOrgRole("viewer", "member")).toBe(false);
    expect(hasOrgRole("admin", "owner")).toBe(false);
  });

  it("rejects unknown roles even for the lowest requirement", () => {
    expect(hasOrgRole("bogus", "viewer")).toBe(false);
  });
});

describe("isOrgRole", () => {
  it("accepts the four org roles only", () => {
    expect(["owner", "admin", "member", "viewer"].every(isOrgRole)).toBe(true);
    expect(isOrgRole("guest")).toBe(false);
  });
});

describe("buildWorkspaceSlug", () => {
  it("slugifies the base and appends the suffix so equal names stay unique", () => {
    expect(buildWorkspaceSlug("Alex's Workspace!", "a1b2")).toBe("alexs-workspace-a1b2");
    expect(buildWorkspaceSlug("Alex's Workspace!", "z9y8")).toBe("alexs-workspace-z9y8");
  });

  it("falls back to 'workspace' when the base has no slug characters", () => {
    expect(buildWorkspaceSlug("!!!", "a1b2")).toBe("workspace-a1b2");
  });
});

describe("personalWorkspaceName", () => {
  it("uses the user's name", () => {
    expect(personalWorkspaceName("Alex", "alex@x.io")).toBe("Alex's Workspace");
  });

  it("falls back to the email local part when the name is blank", () => {
    expect(personalWorkspaceName(null, "bo@x.io")).toBe("bo's Workspace");
    expect(personalWorkspaceName("  ", "bo@x.io")).toBe("bo's Workspace");
  });
});
