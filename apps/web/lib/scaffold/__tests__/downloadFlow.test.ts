// @vitest-environment node
import archiver from "archiver";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Job = { id: string; userId: string; creditsSpent: number; status: string; buildKey: string | null; refundedAt: Date | null };

const { db, state, mockBase } = vi.hoisted(() => {
  const state = { creditsUsed: 0, creditsTotal: 100, jobs: [] as Job[] };
  const tx = {
    user: {
      findUniqueOrThrow: async () => ({ creditsUsed: state.creditsUsed, creditsTotal: state.creditsTotal }),
      update: async ({ data }: { data: { creditsUsed: number | { decrement: number } } }) => {
        state.creditsUsed =
          typeof data.creditsUsed === "number" ? data.creditsUsed : state.creditsUsed - data.creditsUsed.decrement;
        return {};
      },
    },
    scaffoldJob: {
      create: async ({ data }: { data: Omit<Job, "id" | "refundedAt"> }) => {
        const job = { ...data, id: `job${state.jobs.length + 1}`, refundedAt: null };
        state.jobs.push(job);
        return { id: job.id };
      },
      updateMany: async ({ where, data }: { where: { id: string; refundedAt: null }; data: Partial<Job> }) => {
        const job = state.jobs.find((entry) => entry.id === where.id && entry.refundedAt === null);
        if (!job) return { count: 0 };
        Object.assign(job, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => state.jobs.find((job) => job.id === where.id)!,
    },
  };
  const db = {
    $transaction: async (cb: (client: typeof tx) => unknown) => cb(tx),
    scaffoldJob: {
      findUnique: async () => null,
      findFirst: async ({ where }: { where: { userId: string; buildKey: string; status: string } }) =>
        state.jobs.find((job) => job.userId === where.userId && job.buildKey === where.buildKey && job.status === where.status) ??
        null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Job> }) => {
        Object.assign(state.jobs.find((job) => job.id === where.id)!, data);
        return {};
      },
    },
  };
  return { db, state, mockBase: vi.fn() };
});

vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@/lib/scaffold/build-cache", () => ({
  BASE_ROOT: "saas-forge-app",
  computeBuildKey: () => "build-key-1",
  templateFingerprint: () => "fingerprint",
  getOrBuildBaseArchive: mockBase,
}));

import { downloadScaffold, refundScaffoldJob } from "@/lib/scaffold/service";

async function tinyZip(): Promise<Uint8Array<ArrayBuffer>> {
  const archive = archiver("zip");
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise((resolve) => archive.on("end", resolve));
  archive.append("hello", { name: "saas-forge-app/README.md" });
  await archive.finalize();
  await done;
  return new Uint8Array(Buffer.concat(chunks));
}

const input = {
  userId: "u1",
  source: "web" as const,
  name: "demo",
  projectName: "demo",
  modules: ["billing"] as ["billing"],
  platforms: ["web"],
  config: {},
  tierId: "custom",
  versionId: "custom",
  envVars: { NEXT_PUBLIC_URL: "https://demo.example.com" },
};

beforeEach(async () => {
  state.creditsUsed = 0;
  state.jobs = [];
  mockBase.mockReset();
  mockBase.mockResolvedValue({
    bytes: await tinyZip(),
    manifest: { buildKey: "build-key-1", files: [], envExamples: {} },
    cacheHit: true,
  });
});

describe("downloadScaffold", () => {
  it("charges, builds and marks the job ready", async () => {
    const result = await downloadScaffold(input);
    expect(result.charged).toBe(30);
    expect(state.creditsUsed).toBe(30);
    expect(state.jobs[0]).toMatchObject({ status: "ready", buildKey: "build-key-1", creditsSpent: 30 });
  });

  it("re-downloads an owned build for free", async () => {
    await downloadScaffold(input);
    const again = await downloadScaffold(input);
    expect(again.charged).toBe(0);
    expect(state.creditsUsed).toBe(30);
  });

  it("refunds the charge exactly once when the build fails", async () => {
    mockBase.mockRejectedValueOnce(new Error("compile failed"));
    await expect(downloadScaffold(input)).rejects.toThrow("compile failed");

    expect(state.creditsUsed).toBe(0);
    expect(state.jobs[0]).toMatchObject({ status: "failed", creditsSpent: 30 });
    expect(state.jobs[0]!.refundedAt).toBeInstanceOf(Date);

    // A second refund (e.g. a retried cleanup) changes nothing.
    expect(await refundScaffoldJob(state.jobs[0]!.id)).toBe(false);
    expect(state.creditsUsed).toBe(0);
  });

  it("does not let a failed build count as owned", async () => {
    mockBase.mockRejectedValueOnce(new Error("compile failed"));
    await expect(downloadScaffold(input)).rejects.toThrow();
    const retry = await downloadScaffold(input);
    expect(retry.charged).toBe(30);
  });
});
