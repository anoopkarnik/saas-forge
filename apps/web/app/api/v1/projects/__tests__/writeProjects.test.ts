import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const { mockAuth, InvalidScaffoldModuleError, mockCreate, mockUpdate } = vi.hoisted(
  () => {
    class InvalidScaffoldModuleError extends Error {}
    return {
      mockAuth: vi.fn(),
      InvalidScaffoldModuleError,
      mockCreate: vi.fn(),
      mockUpdate: vi.fn(),
    };
  },
);

vi.mock("@/server/authenticateApiKey", () => ({
  authenticateApiKey: (...a: any[]) => mockAuth(...a),
}));
vi.mock("@/lib/scaffold-modules", () => ({ InvalidScaffoldModuleError }));
vi.mock("@/lib/scaffold/project-service", () => ({
  createProject: (...a: any[]) => mockCreate(...a),
  updateProject: (...a: any[]) => mockUpdate(...a),
}));
vi.mock("@workspace/database/client", () => ({
  default: { projectConfig: { findMany: vi.fn(), findFirst: vi.fn() } },
}));

import { POST } from "../route";
import { PATCH } from "../[slug]/route";

const makeReq = (body: unknown) => ({ json: async () => body }) as any;
const ctx = { params: Promise.resolve({ slug: "my-app" }) };

describe("POST /api/v1/projects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires write:projects", async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: {} }, { status: 401 }),
    });
    const req = makeReq({ name: "x" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["write:projects"] });
  });

  it("400s on an invalid body (missing name)", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400s on invalid modules", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockCreate.mockRejectedValueOnce(new InvalidScaffoldModuleError("bad"));
    const res = await POST(makeReq({ name: "App", modules: ["nope"] }));
    expect(res.status).toBe(400);
  });

  it("creates a project and reports stripped secrets", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockCreate.mockResolvedValue({
      project: { slug: "my-app" },
      strippedKeys: ["DATABASE_URL"],
    });
    const res = await POST(makeReq({ name: "My App", config: { DATABASE_URL: "x" } }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.project.slug).toBe("my-app");
    expect(body.strippedKeys).toEqual(["DATABASE_URL"]);
  });
});

describe("PATCH /api/v1/projects/[slug]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires write:projects", async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: {} }, { status: 401 }),
    });
    const res = await PATCH(makeReq({ name: "x" }), ctx);
    expect(res.status).toBe(401);
  });

  it("404s when the project is missing", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockUpdate.mockResolvedValue(null);
    const res = await PATCH(makeReq({ name: "x" }), ctx);
    expect(res.status).toBe(404);
  });

  it("400s on invalid modules", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockUpdate.mockRejectedValueOnce(new InvalidScaffoldModuleError("bad"));
    const res = await PATCH(makeReq({ modules: ["nope"] }), ctx);
    expect(res.status).toBe(400);
  });

  it("updates and returns the project", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockUpdate.mockResolvedValue({ slug: "my-app", name: "Renamed" });
    const res = await PATCH(makeReq({ name: "Renamed" }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.name).toBe("Renamed");
  });
});
