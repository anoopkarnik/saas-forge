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
    expect(mockBuildKit).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
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

  it("400s on an unknown module", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockPreview.mockImplementationOnce(() => {
      throw new InvalidScaffoldModuleError("Unknown module: crm");
    });
    expect((await GET(getReq("?modules=crm"), ctx)).status).toBe(400);
  });
});
