import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const {
  mockAuth,
  mockFindFirst,
  mockUpdate,
  InvalidScaffoldModuleError,
  mockValidate,
  mockCalc,
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  mockBuild,
  mockCharge,
  mockHash,
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
    mockCalc: vi.fn(() => ({ totalCredits: 30, baseCredits: 20, moduleCredits: [] })),
    InsufficientCreditsError,
    ScaffoldRootNotFoundError,
    mockBuild: vi.fn(() => ({
      stream: new ReadableStream({ start: (c) => c.close() }),
      pricing: {},
      cleanup: () => {},
    })),
    mockCharge: vi.fn(async () => ({ charged: 30, alreadyProcessed: false, jobId: "j1" })),
    mockHash: vi.fn(() => "hash-A"),
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
  calculateScaffoldCredits: mockCalc,
  isPriceChanged: (await importOriginal<typeof import("@/lib/scaffold-modules")>()).isPriceChanged,
}));
vi.mock("@/lib/scaffold/template-version", () => ({
  getTemplateVersion: () => "1.4.1",
}));
vi.mock("@/lib/scaffold/service", () => ({
  InsufficientCreditsError,
  ScaffoldRootNotFoundError,
  buildProjectZip: mockBuild,
  chargeScaffoldCredits: mockCharge,
  computeBuildHash: mockHash,
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
  templateVersion: "1.4.1",
  lastBuiltHash: null,
};

const ctx = { params: Promise.resolve({ slug: "my-app" }) };
function reqWith(idem?: string, body?: unknown) {
  const headers = new Headers();
  if (idem) headers.set("Idempotency-Key", idem);
  const json = async () => {
    if (body === undefined) throw new SyntaxError("Unexpected end of JSON input");
    return body;
  };
  return { headers, json } as any;
}

describe("POST /api/v1/projects/[slug]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockImplementation((m: any) => m);
    mockHash.mockReturnValue("hash-A");
    mockCalc.mockReturnValue({ totalCredits: 30, baseCredits: 20, moduleCredits: [] });
    mockCharge.mockResolvedValue({ charged: 30, alreadyProcessed: false, jobId: "j1" });
    mockBuild.mockReturnValue({
      stream: new ReadableStream({ start: (c) => c.close() }),
      pricing: {},
      cleanup: () => {},
    });
  });

  it("requires the scaffold:download scope", async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: {} }, { status: 401 }),
    });
    const req = reqWith();
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["scaffold:download"] });
  });

  it("404s for a project the caller doesn't own", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(null);
    const res = await POST(reqWith(), ctx);
    expect(res.status).toBe(404);
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("400s on invalid stored modules before charging", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockValidate.mockImplementationOnce(() => {
      throw new InvalidScaffoldModuleError("Unknown scaffold module");
    });
    const res = await POST(reqWith(), ctx);
    expect(res.status).toBe(400);
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("403s when credits are insufficient (no zip built)", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    mockCharge.mockRejectedValueOnce(new InsufficientCreditsError());
    const res = await POST(reqWith(), ctx);
    expect(res.status).toBe(403);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it("charges base+modules and streams the zip", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const res = await POST(reqWith("idem-1"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("X-Credits-Charged")).toBe("30");
    expect(mockCharge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amount: 30, idempotencyKey: "idem-1" }),
    );
    expect(mockBuild).toHaveBeenCalled();
  });

  it("409s on a stale expected price without charging", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const res = await POST(reqWith(undefined, { expectedTotalCredits: 20 }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("price_changed");
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("downloads when the expected price matches", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(PROJECT);
    const res = await POST(reqWith(undefined, { expectedTotalCredits: 30 }), ctx);
    expect(res.status).toBe(200);
    expect(mockCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 30 }));
  });

  it("re-downloads an unchanged project for free", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue({ ...PROJECT, lastBuiltHash: "hash-A" });
    const res = await POST(reqWith(), ctx);
    expect(res.status).toBe(200);
    expect(mockCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
  });
});
