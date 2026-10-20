import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const {
  mockAuth,
  mockFindFirst,
  mockUpdate,
  InvalidScaffoldModuleError,
  mockValidate,
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  mockBuildKit,
  mockCharge,
  mockDelta,
  mockHash,
  mockPreview,
  mockProviders,
  mockResolveBase,
} = vi.hoisted(() => {
  class InvalidScaffoldModuleError extends Error {}
  class InsufficientCreditsError extends Error {}
  class ScaffoldRootNotFoundError extends Error {}
  return {
    mockAuth: vi.fn(),
    mockFindFirst: vi.fn(),
    mockUpdate: vi.fn(async () => ({})),
    InvalidScaffoldModuleError,
    mockValidate: vi.fn((m: any) => m),
    InsufficientCreditsError,
    ScaffoldRootNotFoundError,
    mockBuildKit: vi.fn(() => ({
      stream: new ReadableStream({ start: (c) => c.close() }),
      delta: {},
      cleanup: () => {},
    })),
    mockCharge: vi.fn(async () => ({ charged: 23, alreadyProcessed: false, jobId: "j1" })),
    mockDelta: vi.fn(() => ({
      addedModules: ["ai"],
      removedModules: [],
      tierSteps: 1,
      deltaCredits: 23,
    })),
    mockHash: vi.fn(() => "hash-Z"),
    mockProviders: vi.fn((config: Record<string, unknown>) => ({
      fromProviders: {},
      toProviders: {},
      switched: [] as string[],
      config,
    })),
    mockResolveBase: vi.fn(async (): Promise<any> => ({ status: "current" })),
    mockPreview: vi.fn(() => ({
      delta: { addedModules: ["ai"], removedModules: [], tierSteps: 0, deltaCredits: 20 },
      files: { added: 40, modified: 3, removed: 0 },
      migrations: ["20260601000000_ai_chat"],
    })),
  };
});

vi.mock("@/server/authenticateApiKey", () => ({
  authenticateApiKey: mockAuth,
}));
vi.mock("@workspace/database/client", () => ({
  default: {
    projectLaunchpad: {
      findUnique: async () => ({ state: { mode: "founder", deployment: "docker" } }),
    },
    projectConfig: {
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));
vi.mock("@/lib/scaffold-modules", async (importOriginal) => ({
  InvalidScaffoldModuleError,
  validateSelectedModules: mockValidate,
  isPriceChanged: (await importOriginal<typeof import("@/lib/scaffold-modules")>()).isPriceChanged,
}));
vi.mock("@/lib/scaffold/template-version", () => ({
  getTemplateVersion: () => "1.4.1",
}));
vi.mock("@/lib/scaffold/service", () => ({
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  buildUpgradeKit: mockBuildKit,
  chargeScaffoldCredits: mockCharge,
  computeUpgradeDelta: mockDelta,
  computeBuildHash: mockHash,
  previewUpgrade: mockPreview,
  upgradeProviders: mockProviders,
  resolveProjectUpgradeBase: mockResolveBase,
  buildUpgradeKitFromBase: mockBuildKit,
}));
vi.mock("@/lib/scaffold/releases", () => ({
  loadReleases: () => [],
  getProjectReleases: () => ({ currentVersion: "1.4.1", latestVersion: "1.4.1", behind: 0, releases: [], advisories: [] }),
}));

import { GET, POST } from "../route";

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
  templateVersion: "1.4.1",
  lastBuiltHash: null,
};

const ctx = { params: Promise.resolve({ slug: "my-app" }) };
function makeReq(body: unknown, idem?: string) {
  const headers = new Headers();
  if (idem) headers.set("Idempotency-Key", idem);
  return { headers, json: async () => body } as any;
}

describe("POST /api/v1/projects/[slug]/upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockImplementation((m: any) => m);
    mockDelta.mockReturnValue({
      addedModules: ["ai"],
      removedModules: [],
      tierSteps: 1,
      deltaCredits: 23,
    });
    mockCharge.mockResolvedValue({ charged: 23, alreadyProcessed: false, jobId: "j1" });
    mockBuildKit.mockReturnValue({
      stream: new ReadableStream({ start: (c) => c.close() }),
      delta: {},
      cleanup: () => {},
    });
  });

  it("requires the scaffold:upgrade scope", async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: {} }, { status: 401 }),
    });
    const req = makeReq({});
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["scaffold:upgrade"] });
  });

  it("404s for a project the caller doesn't own", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(null);
    const res = await POST(makeReq({ modules: ["billing", "ai"] }), ctx);
    expect(res.status).toBe(404);
  });

  it("400s when there is nothing to upgrade", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockDelta.mockReturnValue({
      addedModules: [],
      removedModules: [],
      tierSteps: 0,
      deltaCredits: 0,
    });
    const res = await POST(makeReq({ modules: ["billing"] }), ctx);
    expect(res.status).toBe(400);
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("403s when credits are insufficient (no kit built)", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockCharge.mockRejectedValueOnce(new InsufficientCreditsError());
    const res = await POST(makeReq({ modules: ["billing", "ai"] }), ctx);
    expect(res.status).toBe(403);
    expect(mockBuildKit).not.toHaveBeenCalled();
  });

  it("409s on a stale expected delta without charging", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const res = await POST(makeReq({ modules: ["billing", "ai"], expectedTotalCredits: 20 }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("price_changed");
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("charges the delta and streams the upgrade kit", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const res = await POST(makeReq({ modules: ["billing", "ai"], tierId: "tier-2" }, "idem-9"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("X-Credits-Charged")).toBe("23");
    expect(res.headers.get("X-Upgrade-Added-Modules")).toBe("ai");
    expect(mockCharge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 23, idempotencyKey: "idem-9" }),
    );
    expect(mockBuildKit).toHaveBeenCalledWith(expect.objectContaining({ guidePreferences: { mode: "founder", deployment: "docker", launchpadState: {mode:"founder",deployment:"docker"} } }), expect.anything());
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("POST /api/v1/projects/[slug]/upgrade release kit", () => {
  const BASE = { version: "1.4.0", starterRoot: "/tmp/s", rulesRoot: "/tmp/r" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockValidate.mockImplementation((m: any) => m);
    mockDelta.mockReturnValue({ addedModules: [], removedModules: [], tierSteps: 0, deltaCredits: 0 });
    mockCharge.mockResolvedValue({ charged: 0, alreadyProcessed: false, jobId: "j3" });
    mockBuildKit.mockReturnValue({ stream: new ReadableStream({ start: (c) => c.close() }), delta: {}, cleanup: () => {} });
  });

  it("streams a free kit of the releases since the project's version", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "snapshot", base: BASE });
    const res = await POST(makeReq({ fromVersion: "1.4.0" }), ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Upgrade-Kind")).toBe("release");
    expect(mockResolveBase).toHaveBeenCalledWith("u1", ["billing"], "1.4.0");
    expect(mockCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
    expect(mockBuildKit).toHaveBeenCalledWith(expect.objectContaining({ fromBase: BASE }), expect.anything());
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { templateVersion: "1.4.1" } });
  });

  it("starts from the stored version when the client sends none", async () => {
    mockFindFirst.mockResolvedValue({ ...PROJECT, templateVersion: "1.3.0" });
    mockResolveBase.mockResolvedValueOnce({ status: "snapshot", base: { ...BASE, version: "1.3.0" } });
    expect((await POST(makeReq({}), ctx)).status).toBe(200);
    expect(mockResolveBase).toHaveBeenCalledWith("u1", ["billing"], "1.3.0");
  });

  it("422s when no snapshot of that release was published", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "missing", version: "1.4.0" });
    const res = await POST(makeReq({ fromVersion: "1.4.0" }), ctx);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("release_kit_unavailable");
    expect(body.error.message).toContain("--mark-current");
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("403s a release kit for modules the user never bought", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "not_owned" });
    const res = await POST(makeReq({ fromVersion: "1.4.0" }), ctx);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("release_kit_not_owned");
    expect(mockCharge).not.toHaveBeenCalled();
    expect(mockBuildKit).not.toHaveBeenCalled();
  });

  it("builds a paid upgrade without the old release when its modules were never bought", async () => {
    mockDelta.mockReturnValue({ addedModules: ["ai"], removedModules: [], tierSteps: 0, deltaCredits: 20 });
    mockResolveBase.mockResolvedValueOnce({ status: "not_owned" });
    expect((await POST(makeReq({ modules: ["billing", "ai"], fromVersion: "1.4.0" }), ctx)).status).toBe(200);
    expect(mockBuildKit).toHaveBeenCalledWith(expect.objectContaining({ fromBase: undefined }), { releaseOnly: false });
  });

  it("400s when the project is already on the latest release", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "current" });
    const res = await POST(makeReq({ fromVersion: "1.4.1" }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("nothing_to_upgrade");
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("400s on a version that is not x.y.z", async () => {
    mockResolveBase.mockResolvedValueOnce({ status: "invalid" });
    const res = await POST(makeReq({ fromVersion: "latest" }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_version");
  });

  it("carries the release changes into a paid module upgrade", async () => {
    mockDelta.mockReturnValue({ addedModules: ["ai"], removedModules: [], tierSteps: 0, deltaCredits: 20 });
    mockResolveBase.mockResolvedValueOnce({ status: "snapshot", base: BASE });
    const res = await POST(makeReq({ modules: ["billing", "ai"], fromVersion: "1.4.0" }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Upgrade-Kind")).toBe("upgrade");
    expect(mockCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 20 }));
    expect(mockBuildKit).toHaveBeenCalledWith(expect.objectContaining({ fromBase: BASE }), expect.anything());
  });

  it("keeps a module upgrade working when the old release has no snapshot", async () => {
    mockDelta.mockReturnValue({ addedModules: ["ai"], removedModules: [], tierSteps: 0, deltaCredits: 20 });
    mockResolveBase.mockResolvedValueOnce({ status: "missing", version: "1.4.0" });
    expect((await POST(makeReq({ modules: ["billing", "ai"], fromVersion: "1.4.0" }), ctx)).status).toBe(200);
    expect(mockBuildKit).toHaveBeenCalledWith(expect.objectContaining({ fromBase: undefined }), expect.anything());
  });
});

describe("POST /api/v1/projects/[slug]/upgrade provider switch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a kit for a provider switch alone, charging nothing extra", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockValidate.mockImplementation((m: any) => m);
    mockDelta.mockReturnValue({ addedModules: [], removedModules: [], tierSteps: 0, deltaCredits: 0 });
    mockProviders.mockReturnValueOnce({
      fromProviders: { payment_gateway: "stripe" },
      toProviders: { payment_gateway: "dodo" },
      switched: ["payment_gateway"],
      config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo" },
    });
    mockCharge.mockResolvedValue({ charged: 0, alreadyProcessed: false, jobId: "j2" });
    mockBuildKit.mockReturnValue({ stream: new ReadableStream({ start: (c) => c.close() }), delta: {}, cleanup: () => {} });

    const res = await POST(makeReq({ providers: { payment_gateway: "dodo" } }), ctx);

    expect(res.status).toBe(200);
    expect(mockProviders).toHaveBeenCalledWith(PROJECT.config, ["billing"], ["billing"], { payment_gateway: "dodo" });
    expect(mockBuildKit).toHaveBeenCalledWith(
      expect.objectContaining({ fromProviders: { payment_gateway: "stripe" }, toProviders: { payment_gateway: "dodo" } }), expect.anything(),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo" } }) }),
    );
  });
});

describe("GET /api/v1/projects/[slug]/upgrade", () => {
  const getReq = (query = "") => ({ headers: new Headers(), nextUrl: new URL(`https://x.test/api${query}`) }) as any;

  beforeEach(() => vi.clearAllMocks());

  it("previews the target without charging", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const req = getReq("?modules=billing,ai&tierId=tier-2");

    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["read:projects"] });
    expect(mockPreview).toHaveBeenCalledWith(
      expect.objectContaining({ fromModules: ["billing"], toModules: ["billing", "ai"], toTierId: "tier-2" }),
    );
    expect((await res.json()).preview.files).toEqual({ added: 40, modified: 3, removed: 0 });
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("says whether a free release kit is available for the client's version", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const base = { version: "1.4.0", starterRoot: "/tmp/s", rulesRoot: "/tmp/r" };
    mockResolveBase.mockResolvedValueOnce({ status: "snapshot", base });

    const body = await (await GET(getReq("?fromVersion=1.4.0"), ctx)).json();

    expect(mockPreview).toHaveBeenCalledWith(expect.objectContaining({ fromBase: base }));
    expect(body.releaseKit).toEqual({ available: true, fromVersion: "1.4.0", latestVersion: "1.4.1" });
  });

  it("reports a missing snapshot as unavailable", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockResolveBase.mockResolvedValueOnce({ status: "missing", version: "1.4.0" });
    const body = await (await GET(getReq("?fromVersion=1.4.0"), ctx)).json();
    expect(body.releaseKit).toEqual({ available: false, fromVersion: "1.4.0", latestVersion: "1.4.1", reason: "missing_snapshot" });
  });

  it("400s on an unknown module", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockPreview.mockImplementationOnce(() => {
      throw new InvalidScaffoldModuleError("Unknown module: crm");
    });
    expect((await GET(getReq("?modules=crm"), ctx)).status).toBe(400);
  });
});
