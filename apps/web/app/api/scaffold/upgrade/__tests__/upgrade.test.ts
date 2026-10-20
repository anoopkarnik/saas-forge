import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGuard, mockFindFirst, mockUpdate, mockBuildKit, mockCharge, mockDelta, mockResolveBase } = vi.hoisted(() => ({
  mockGuard: vi.fn(async () => ({ ok: true, session: { user: { id: "u1" } } })),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(async () => ({})),
  mockBuildKit: vi.fn(() => ({ stream: new ReadableStream({ start: (c) => c.close() }), delta: {}, cleanup: () => {} })),
  mockCharge: vi.fn(async () => ({ charged: 0, alreadyProcessed: false, jobId: "j1" })),
  mockDelta: vi.fn(() => ({ addedModules: [], removedModules: [], tierSteps: 0, deltaCredits: 0 })),
  mockResolveBase: vi.fn(async (): Promise<any> => ({ status: "current" })),
}));

vi.mock("@/server/routeGuard", () => ({ guardRoute: mockGuard }));
vi.mock("@workspace/database/client", () => ({
  default: {
    projectLaunchpad: { findUnique: async () => null },
    projectConfig: { findFirst: mockFindFirst, update: mockUpdate },
  },
}));
vi.mock("@/lib/scaffold-modules", async (importOriginal) => ({
  InvalidScaffoldModuleError: class extends Error {},
  validateSelectedModules: (m: string[]) => m,
  isPriceChanged: (await importOriginal<typeof import("@/lib/scaffold-modules")>()).isPriceChanged,
}));
vi.mock("@/lib/scaffold/template-version", () => ({ getTemplateVersion: () => "1.4.1" }));
vi.mock("@/lib/scaffold/releases", () => ({
  loadReleases: () => [],
  getProjectReleases: () => ({ releases: [] }),
}));
vi.mock("@workspace/analytics/server", () => ({ track: vi.fn() }));
vi.mock("@/lib/scaffold/service", () => ({
  InsufficientCreditsError: class extends Error {},
  ScaffoldRootNotFoundError: class extends Error {},
  buildUpgradeKit: mockBuildKit,
  chargeScaffoldCredits: mockCharge,
  computeBuildHash: () => "hash",
  computeUpgradeDelta: mockDelta,
  upgradeProviders: (config: unknown) => ({ fromProviders: {}, toProviders: {}, switched: [], config }),
  resolveUpgradeBase: mockResolveBase,
}));

import { POST } from "../route";

const PROJECT = {
  id: "p1",
  slug: "my-app",
  name: "My App",
  modules: ["billing"],
  platforms: ["web"],
  config: {},
  productTypeId: null,
  tierId: "tier-1",
  versionId: "balanced",
  templateVersion: "1.4.0",
  lastBuiltHash: null,
};
const BASE = { version: "1.4.0", starterRoot: "/tmp/s", rulesRoot: "/tmp/r" };
const req = (body: unknown) => ({ headers: new Headers(), json: async () => body }) as any;

describe("POST /api/scaffold/upgrade release kit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(PROJECT);
  });

  it("downloads a free kit of the releases since the saved version", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "snapshot", base: BASE });
    const res = await POST(req({ slug: "my-app" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Upgrade-Kind")).toBe("release");
    expect(mockResolveBase).toHaveBeenCalledWith("1.4.0");
    expect(mockCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
    expect(mockBuildKit).toHaveBeenCalledWith(expect.objectContaining({ fromBase: BASE }));
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { templateVersion: "1.4.1" } });
  });

  it("422s when the release has no snapshot", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "missing", version: "1.4.0" });
    const res = await POST(req({ slug: "my-app" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/release notes/);
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("400s when the project is current", async () => {
    const res = await POST(req({ slug: "my-app" }));
    expect(res.status).toBe(400);
    expect(mockCharge).not.toHaveBeenCalled();
  });
});
