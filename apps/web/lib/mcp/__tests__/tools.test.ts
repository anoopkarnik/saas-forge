import { beforeEach, describe, expect, it, vi } from "vitest";

// Real module and provider registries; only the database is mocked.
const { mockUser, mockFindFirst, mockUpdate } = vi.hoisted(() => ({
  mockUser: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@workspace/database/client", () => ({
  default: {
    user: { findUnique: mockUser },
    projectConfig: { findFirst: mockFindFirst, update: mockUpdate },
  },
}));
vi.mock("@/lib/scaffold/template-version", () => ({ getTemplateVersion: () => "2.1.0" }));

import { callMcpTool } from "@/lib/mcp/server";
import { mcpTools, type McpTool } from "@/lib/mcp/tools";
import { computeBuildHash } from "@/lib/scaffold/service";

const ALL_SCOPES = ["read:me", "read:credits", "read:projects", "write:projects"];
const caller = { userId: "u1", scopes: ALL_SCOPES };
const toolNamed = (name: string) => mcpTools.find((tool) => tool.name === name) as McpTool;

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
    mockUser.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const result = await call("get_credits");
    expect(result.isError).toBe(true);
    expect(result.text).toBe("get_credits failed on the server. Try again later.");
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
  });

  it("says when the project already has everything asked for", async () => {
    mockFindFirst.mockResolvedValueOnce(project({ modules: ["billing"] }));
    const { data } = await call("quote_upgrade", { slug: "acme", addModules: ["billing"] });
    expect(data).toMatchObject({ nothingToUpgrade: true });
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
