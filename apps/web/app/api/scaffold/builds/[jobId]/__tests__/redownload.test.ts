// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGuard, mockGetOwnedBuild, mockDownload } = vi.hoisted(() => ({
  mockGuard: vi.fn(),
  mockGetOwnedBuild: vi.fn(),
  mockDownload: vi.fn(),
}));

vi.mock("@/server/routeGuard", () => ({ guardRoute: mockGuard }));
vi.mock("@/lib/scaffold/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scaffold/service")>();
  return {
    formValuesFromEnv: actual.formValuesFromEnv,
    ScaffoldRootNotFoundError: actual.ScaffoldRootNotFoundError,
    getOwnedBuild: mockGetOwnedBuild,
    downloadScaffold: mockDownload,
  };
});
vi.mock("@workspace/database/client", () => ({ default: {} }));

import { POST } from "../route";

const ctx = { params: Promise.resolve({ jobId: "job1" }) };
const req = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockGuard.mockResolvedValue({ ok: true, session: { user: { id: "u1" } } });
  mockDownload.mockResolvedValue({ bytes: new Uint8Array([80, 75, 5, 6]), charged: 0 });
});

describe("POST /api/scaffold/builds/[jobId]", () => {
  it("rejects signed-out callers", async () => {
    mockGuard.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    expect((await POST(req, ctx)).status).toBe(401);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("404s for a build the caller does not own", async () => {
    mockGetOwnedBuild.mockResolvedValue(null);
    expect((await POST(req, ctx)).status).toBe(404);
    expect(mockGetOwnedBuild).toHaveBeenCalledWith("u1", "job1");
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("re-downloads an owned build for free, preferring its cached archive", async () => {
    mockGetOwnedBuild.mockResolvedValue({
      id: "job1",
      projectId: null,
      projectName: "my-app",
      toModules: ["billing"],
      toTierId: "custom",
      platforms: ["web"],
      envVars: { NEXT_PUBLIC_URL: "https://my.app" },
      buildKey: "old-key",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("my-app.zip");
    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        free: true,
        projectName: "my-app",
        modules: ["billing"],
        envVars: { NEXT_PUBLIC_URL: "https://my.app" },
        preferredBuildKey: "old-key",
      }),
    );
  });
});
