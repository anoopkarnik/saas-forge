import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/server/authenticateApiKey", () => ({
  authenticateApiKey: (...args: any[]) => mockAuth(...args),
}));

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
vi.mock("@workspace/database/client", () => ({
  default: {
    projectConfig: {
      findMany: (...a: any[]) => mockFindMany(...a),
      findFirst: (...a: any[]) => mockFindFirst(...a),
    },
  },
}));

import { GET as listProjects } from "../route";
import { GET as getProject } from "../[slug]/route";

const req = {} as any;
const unauthorized = {
  ok: false,
  response: NextResponse.json({ error: {} }, { status: 401 }),
};

describe("GET /api/v1/projects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks callers without read:projects", async () => {
    mockAuth.mockResolvedValue(unauthorized);
    const res = await listProjects(req);
    expect(res.status).toBe(401);
    expect(mockAuth).toHaveBeenCalledWith(req, { scopes: ["read:projects"] });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns only the caller's projects", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindMany.mockResolvedValue([{ id: "p1", slug: "mine" }]);
    const res = await listProjects(req);
    const body = await res.json();
    expect(body.projects).toEqual([{ id: "p1", slug: "mine" }]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    );
  });
});

describe("GET /api/v1/projects/[slug]", () => {
  beforeEach(() => vi.clearAllMocks());

  const ctx = { params: Promise.resolve({ slug: "my-app" }) };

  it("404s when the project is not found or not owned", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue(null);
    const res = await getProject(req, ctx);
    expect(res.status).toBe(404);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", slug: "my-app" } }),
    );
  });

  it("returns the owned project", async () => {
    mockAuth.mockResolvedValue({ ok: true, userId: "u1" });
    mockFindFirst.mockResolvedValue({ id: "p1", slug: "my-app", config: {} });
    const res = await getProject(req, ctx);
    const body = await res.json();
    expect(body.project.slug).toBe("my-app");
  });
});
