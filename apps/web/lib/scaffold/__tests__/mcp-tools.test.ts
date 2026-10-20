import { beforeEach, describe, expect, it, vi } from "vitest";

// Real module and provider registries; only the database and site config are mocked.
const { mockUser, mockFindFirst, mockUpdate, mockTrack } = vi.hoisted(() => ({
  mockUser: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockTrack: vi.fn(async () => {}),
}));

vi.mock("@workspace/database/client", () => ({
  default: {
    user: { findUnique: mockUser },
    projectConfig: { findFirst: mockFindFirst, update: mockUpdate },
  },
}));
vi.mock("@workspace/analytics/server", () => ({ track: mockTrack }));
vi.mock("@/lib/scaffold/template-version", () => ({ getTemplateVersion: () => "2.1.0" }));
vi.mock("@/lib/site-config/service", () => ({ getSiteConfig: async () => ({ "branding.saasName": "SaaS Forge" }) }));

import type { McpTool } from "@/lib/mcp/define";
import { callMcpTool } from "@/lib/mcp/server";
import { platformMcpTools } from "@/lib/scaffold/mcp-tools";
import { computeBuildHash } from "@/lib/scaffold/service";

const ALL_SCOPES = ["read:me", "read:credits", "read:projects", "write:projects"];
const caller = { userId: "u1", scopes: ALL_SCOPES };
const toolNamed = (name: string) => platformMcpTools.find((tool) => tool.name === name) as McpTool;

async function call(name: string, input: unknown = {}, who = caller) {
  const result = await callMcpTool(toolNamed(name), input, who);
  const text = (result.content[0] as { text: string }).text;
  return { isError: !!result.isError, text, data: result.isError ? null : JSON.parse(text) };
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Acme",
    slug: "acme",
    productTypeId: null,
    tierId: "tier-1",
    versionId: "balanced",
    platforms: ["web"],
    modules: [] as string[],
    templateVersion: "2.1.0",
    lastBuiltAt: new Date("2026-10-01"),
    lastBuiltHash: "old",
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("scopes and errors", () => {
  it("refuses a tool whose scope the key lacks", async () => {
    const result = await call("list_projects", {}, { userId: "u1", scopes: ["read:me"] });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("read:projects");
  });

  it("hides unexpected server errors from the model", async () => {
    mockFindFirst.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const result = await call("get_project", { slug: "acme" });
    expect(result.isError).toBe(true);
    expect(result.text).toBe("get_project failed on the server. Try again later.");
  });

  it("names a missing project and how to find one", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const result = await call("get_project", { slug: "nope" });
    expect(result).toMatchObject({ isError: true });
    expect(result.text).toContain("list_projects");
  });
});

describe("get_catalog", () => {
  it("lists modules with requirements and the provider choices", async () => {
    const { data } = await call("get_catalog");
    expect(data.modules.find((m: { id: string }) => m.id === "webhooks").requires).toEqual(["jobs"]);
    expect(data.providers.find((p: { id: string }) => p.id === "payment_gateway").values).toContain("dodo");
  });
});

describe("quote_download", () => {
  it("prices a new build and returns the CLI command", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"], lastBuiltAt: null, lastBuiltHash: null }));
    const { data } = await call("quote_download", { slug: "acme" });
    expect(data).toMatchObject({ credits: 30, alreadyOwned: false });
    expect(data.command).toBe("npx create-saas-forge new acme --project acme --yes");
  });

  it("is free when the saved config matches the last build", async () => {
    const built = project({ modules: ["billing"] });
    built.lastBuiltHash = computeBuildHash(built);
    mockFindFirst.mockResolvedValueOnce(built);
    const { data } = await call("quote_download", { slug: "acme" });
    expect(data).toMatchObject({ credits: 0, alreadyOwned: true });
  });
});

describe("quote_upgrade", () => {
  it("adds required modules and charges only for what is new", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"] }));
    const { data } = await call("quote_upgrade", { slug: "acme", addModules: ["webhooks"] });
    expect(data.addedModules.sort()).toEqual(["jobs", "webhooks"]);
    expect(data.requiredByRequested).toEqual(["jobs"]);
    expect(data.credits).toBe(25);
    expect(data.command).toMatch(/^npx create-saas-forge upgrade --project acme --add (jobs,webhooks|webhooks,jobs) --yes$/);
    expect(data.previewCommand).toMatch(/--dry-run$/);
    expect(data.releases).toMatchObject({ currentVersion: "2.1.0", behind: 0 });
    expect(mockTrack).toHaveBeenCalledWith(
      "mcp.quote_viewed",
      { kind: "upgrade", credits: 25, modules: expect.arrayContaining(["jobs", "webhooks"]) },
      { distinctId: "u1" },
    );
  });

  it("says when the project already has everything asked for", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"] }));
    const { data } = await call("quote_upgrade", { slug: "acme", addModules: ["billing"] });
    expect(data).toMatchObject({ nothingToUpgrade: true });
    expect(data.message).not.toContain("mark_project_current");
  });

  it("offers a project behind the latest release the free release kit", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"], templateVersion: "2.0.0" }));
    const { data } = await call("quote_upgrade", { slug: "acme" });
    expect(data).toMatchObject({
      nothingToUpgrade: false,
      kind: "release",
      fromVersion: "2.0.0",
      latestVersion: "2.1.0",
      credits: 0,
      command: "npx create-saas-forge upgrade --project acme --yes",
      previewCommand: "npx create-saas-forge upgrade --project acme --dry-run",
    });
    // When no snapshot of that release exists, the dry run says so and the agent falls back.
    expect(data.nextSteps.join(" ")).toContain("mark_project_current");
    expect(mockTrack).toHaveBeenCalledWith("mcp.quote_viewed", { kind: "release", credits: 0, modules: [] }, { distinctId: "u1" });
  });

  it("goes by the version in the repository when the agent passes it", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"], templateVersion: "2.0.0" }));
    const { data } = await call("quote_upgrade", { slug: "acme", fromVersion: "2.1.0" });
    expect(data).toMatchObject({ nothingToUpgrade: true, templateVersion: "2.1.0", latestVersion: "2.1.0" });
  });

  it("switches a provider for free", async () => {
    mockFindFirst.mockResolvedValueOnce(
      project({ modules: ["billing"], config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe" } }),
    );
    const { data } = await call("quote_upgrade", { slug: "acme", providers: { payment_gateway: "dodo" } });
    expect(data.credits).toBe(0);
    expect(data.providerSwitches).toEqual([{ toggle: "payment_gateway", from: "stripe", to: "dodo" }]);
    expect(data.command).toContain("--provider payment_gateway=dodo");
  });

  it("rejects an unknown module with the registry's message", async () => {
    mockFindFirst.mockResolvedValueOnce(project());
    const result = await call("quote_upgrade", { slug: "acme", addModules: ["crypto"] });
    expect(result).toMatchObject({ isError: true });
    expect(result.text).toContain("Unknown scaffold module: crypto");
  });

  it("keeps shell syntax out of the returned command", async () => {
    const result = await call("quote_upgrade", { slug: "acme", tierId: "tier-2; rm -rf ~" });
    expect(result.isError).toBe(true);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });
});

describe("mark_project_current", () => {
  it("records the latest version and keeps a free re-download free", async () => {
    const behind = project({ modules: ["billing"], templateVersion: "2.0.0" });
    behind.lastBuiltHash = computeBuildHash(behind);
    mockFindFirst.mockResolvedValueOnce(behind);
    const { data } = await call("mark_project_current", { slug: "acme" });
    expect(data).toMatchObject({ slug: "acme", fromVersion: "2.0.0", templateVersion: "2.1.0", credits: 0 });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { templateVersion: "2.1.0", lastBuiltHash: computeBuildHash({ ...behind, templateVersion: "2.1.0" }) },
    });
  });

  it("does not make a paid re-download free", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ templateVersion: "2.0.0", lastBuiltHash: "edited-since" }));
    await call("mark_project_current", { slug: "acme" });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { templateVersion: "2.1.0" } });
  });

  it("leaves a project already on the latest version alone", async () => {
    mockFindFirst.mockResolvedValueOnce(project());
    const { data } = await call("mark_project_current", { slug: "acme" });
    expect(data).toMatchObject({ alreadyCurrent: true, templateVersion: "2.1.0" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("refuses a project that was never downloaded", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ templateVersion: "2.0.0", lastBuiltAt: null, lastBuiltHash: null }));
    const result = await call("mark_project_current", { slug: "acme" });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("never downloaded");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("needs the write:projects scope", async () => {
    const result = await call("mark_project_current", { slug: "acme" }, { userId: "u1", scopes: ["read:projects"] });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("write:projects");
  });
});

describe("update_project", () => {
  it("refuses to change the modules of a downloaded project", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"] }));
    const result = await call("update_project", { slug: "acme", modules: ["billing", "ai"] });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("quote_upgrade");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("still edits the name of a downloaded project", async () => {
    const current = project({ modules: ["billing"] });
    mockFindFirst.mockResolvedValueOnce(current).mockResolvedValueOnce({ id: "p1" });
    mockUpdate.mockResolvedValueOnce({ ...current, name: "Acme 2" });
    const { data } = await call("update_project", { slug: "acme", name: "Acme 2", modules: ["billing"] });
    expect(data.project.name).toBe("Acme 2");
  });

  it("lets a project change modules before its first download", async () => {
    const draft = project({ lastBuiltAt: null, lastBuiltHash: null });
    mockFindFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce({ id: "p1" });
    mockUpdate.mockResolvedValueOnce({ ...draft, modules: ["ai"] });
    const { data } = await call("update_project", { slug: "acme", modules: ["ai"] });
    expect(data.project.modules).toEqual(["ai"]);
  });
});
