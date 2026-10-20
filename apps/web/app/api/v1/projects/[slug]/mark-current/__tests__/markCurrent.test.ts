import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const { mockAuth, mockMarkCurrent } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockMarkCurrent: vi.fn(),
}));

vi.mock("@/server/authenticateApiKey", () => ({
  authenticateApiKey: (...a: any[]) => mockAuth(...a),
}));
vi.mock("@/lib/scaffold/project-service", () => ({
  markProjectCurrent: (...a: any[]) => mockMarkCurrent(...a),
}));

import { POST } from "../route";

const req = {} as any;
const ctx = { params: Promise.resolve({ slug: "my-app" }) };

describe("POST /api/v1/projects/[slug]/mark-current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
  });

  it("requires write:projects", async () => {
    mockAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: {} }, { status: 401 }) });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["write:projects"] });
    expect(mockMarkCurrent).not.toHaveBeenCalled();
  });

  it("records the latest version for the key's user", async () => {
    mockMarkCurrent.mockResolvedValue({ status: "marked", fromVersion: "2.1.0", templateVersion: "2.1.1" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(mockMarkCurrent).toHaveBeenCalledWith("u1", "my-app");
    expect(await res.json()).toEqual({ fromVersion: "2.1.0", templateVersion: "2.1.1", alreadyCurrent: false });
  });

  it("succeeds without a change when the project is already current", async () => {
    mockMarkCurrent.mockResolvedValue({ status: "current", templateVersion: "2.1.1" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fromVersion: "2.1.1", templateVersion: "2.1.1", alreadyCurrent: true });
  });

  it("404s on a project that does not exist or is not owned", async () => {
    mockMarkCurrent.mockResolvedValue({ status: "not_found" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("409s on a project that was never downloaded", async () => {
    mockMarkCurrent.mockResolvedValue({ status: "not_downloaded" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("not_downloaded");
  });
});
