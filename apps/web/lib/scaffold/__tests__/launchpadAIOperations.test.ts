// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeDraft } from "./launchpad-fixtures";
import { buildSourcePack } from "../launchpad/source-pack";
import { initialAIState } from "../launchpad/ai-state";
import { defaultLaunchpadState } from "../launchpad/state";
import { currentAIFingerprint } from "../launchpad/ai-runtime";
import type {
  LaunchpadState,
  LaunchpadProject,
  SourcePack,
} from "../launchpad/types";
import type { TRPCContext } from "@/trpc/init";

type Job = {
  id: string;
  userId: string;
  agentId: string;
  status: string;
  input: { kind: string; sourcePack: SourcePack };
  result?: unknown;
  createdAt: Date;
};
const { rows, jobs, project, client, dispatch } = vi.hoisted(() => {
  const rows = new Map<string, { projectId: string; state: LaunchpadState }>();
  const jobs = new Map<string, Job>();
  const project: LaunchpadProject & { id: string; userId: string } = {
    id: "p1",
    userId: "u1",
    slug: "demo",
    name: "Demo",
    modules: [],
    platforms: ["web"],
    templateVersion: "2.0.0",
    config: { DATABASE_URL: "postgresql://secret:password@host/app" },
  };
  const dispatch = vi.fn(async () => {});
  const client = {
    projectConfig: {
      findFirst: vi.fn(
        async ({ where }: { where: { userId: string; slug: string } }) =>
          where.userId === project.userId && where.slug === project.slug
            ? project
            : null,
      ),
    },
    projectLaunchpad: {
      findUnique: vi.fn(
        async ({ where }: { where: { projectId: string } }) =>
          rows.get(where.projectId) ?? null,
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { projectId: string };
          create: { projectId: string; state: LaunchpadState };
          update: { state: LaunchpadState };
        }) => {
          const row = { ...(rows.get(where.projectId) ?? create), ...update };
          rows.set(where.projectId, row);
          return row;
        },
      ),
    },
    aiJobRun: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { id: { in: string[] }; userId: string; agentId: string };
        }) =>
          [...jobs.values()].filter(
            (job) =>
              where.id.in.includes(job.id) &&
              job.userId === where.userId &&
              job.agentId === where.agentId,
          ),
      ),
      count: vi.fn(async () => jobs.size),
      create: vi.fn(
        async ({ data }: { data: Omit<Job, "id" | "createdAt"> }) => {
          const row = {
            ...data,
            id: `job-${jobs.size + 1}`,
            createdAt: new Date(),
          };
          jobs.set(row.id, row);
          return row;
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; userId: string; status: { in: string[] } };
          data: { status: string };
        }) => {
          const row = jobs.get(where.id);
          if (
            !row ||
            row.userId !== where.userId ||
            !where.status.in.includes(row.status)
          )
            return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        },
      ),
    },
    $transaction: async (
      run: (tx: unknown) => Promise<unknown>,
    ): Promise<unknown> => run(client),
  };
  return { rows, jobs, project, client, dispatch };
});
vi.mock("@workspace/database/client", () => ({ default: client }));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: async () => null } },
}));
vi.mock("@/lib/ai-jobs/service", () => ({ dispatchAiJob: dispatch }));
vi.mock("@workspace/jobs/inngest", () => ({
  inngest: { send: vi.fn(async () => {}) },
}));
import { createTRPCRouter } from "@/trpc/init";
import { launchpadProcedures } from "../launchpad/procedures";
const router = createTRPCRouter(launchpadProcedures);
const caller = (userId = "u1", role = "user") =>
  router.createCaller({
    headers: new Headers(),
    session: {
      user: { id: userId, role, email: "owner@example.com", name: "Owner" },
    },
  } as unknown as TRPCContext);
const answers = {
  audience: "Early customers",
  journey: "Create a project and see it",
  setup: "Downloaded starter",
  os: "Linux",
  launch: "Small web MVP",
};
async function confirm() {
  await caller().saveLaunchpadBrief({
    slug: "demo",
    answers,
    summary: "A small project tracker.",
  });
  await caller().confirmLaunchpadBrief({ slug: "demo", revision: 1 });
}
async function generated() {
  const state = rows.get("p1")?.state ?? defaultLaunchpadState();
  state.ai = state.ai ?? initialAIState();
  const job: Job = {
    id: "job-1",
    userId: "u1",
    agentId: "launchpad_v1",
    status: "SUCCEEDED",
    createdAt: new Date(),
    input: {
      kind: "generate",
      sourcePack: buildSourcePack(project, "vercel", "local"),
    },
  };
  jobs.set(job.id, job);
  state.ai.operations.push({
    jobId: job.id,
    kind: "generate",
    stage: "local",
    fingerprint: currentAIFingerprint(project, state),
    briefRevision: 0,
    createdAt: new Date().toISOString(),
  });
  rows.set("p1", { projectId: "p1", state });
  job.status = "SUCCEEDED";
  job.result = {
    output: {
      ...completeDraft(job.input.sourcePack),
      tasks: completeDraft(job.input.sourcePack).tasks.map((task, index) => ({
        ...task,
        title: `Action ${index}`,
      })),
    },
    provider: "nvidia",
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    usage: {},
  };
  return job;
}
beforeEach(() => {
  rows.clear();
  jobs.clear();
  dispatch.mockClear();
  dispatch.mockResolvedValue(undefined);
  client.aiJobRun.count.mockImplementation(async () => jobs.size);
  project.templateVersion = "2.0.0";
});

describe("configuration-guided AI Launchpad operations", () => {
  it("protects optional help and rejects generation on a fresh project", async () => {
    for (const [owner, role, code] of [
      ["other", "user", "NOT_FOUND"],
      ["u1", "guest", "FORBIDDEN"],
    ]) {
      await expect(
        caller(owner, role).startLaunchpadOperation({
          slug: "demo",
          kind: "help",
          taskId: "curated:local.account.postgres",
          message: "Explain this task",
          stage: "local",
        }),
      ).rejects.toMatchObject({ code });
    }
    await caller().startLaunchpadOperation({
      slug: "demo",
      kind: "help",
      taskId: "curated:local.account.postgres",
      message: "Explain this task",
      stage: "local",
    });
    await expect(
      caller().startLaunchpadOperation({
        slug: "demo",
        kind: "generate",
        stage: "local",
      }),
    ).rejects.toThrow(/curated/);
    expect(jobs.size).toBe(1);
    expect(jobs.get("job-1")!.input).not.toHaveProperty("brief");
  });
  it("sends only approved guidance and confirmed answers; prevents concurrent operations and applies the daily cap", async () => {
    await confirm();
    await caller().startLaunchpadOperation({
      slug: "demo",
      kind: "help",
      taskId: "curated:local.account.postgres",
      message: "Explain this task",
      stage: "local",
    });
    expect(jobs.get("job-1")!.input).not.toHaveProperty("brief");
    expect(JSON.stringify(jobs.get("job-1")!.input)).not.toContain(
      "secret:password",
    );
    expect(dispatch).toHaveBeenCalledWith({
      id: "job-1",
      agentId: "launchpad_v1",
    });
    await expect(
      caller().startLaunchpadOperation({
        slug: "demo",
        kind: "help",
        taskId: "curated:local.account.postgres",
        message: "Explain this task",
        stage: "mvp",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    jobs.get("job-1")!.status = "FAILED";
    client.aiJobRun.count.mockResolvedValue(30);
    await expect(
      caller().startLaunchpadOperation({
        slug: "demo",
        kind: "help",
        taskId: "curated:local.account.postgres",
        message: "Explain this task",
        stage: "local",
      }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
  it("keeps durable pending work when dispatch fails and cancels without altering a checklist", async () => {
    await confirm();
    dispatch.mockRejectedValueOnce(new Error("queue unavailable"));
    const result = await caller().startLaunchpadOperation({
      slug: "demo",
      kind: "help",
      taskId: "curated:local.account.postgres",
      message: "Explain this task",
      stage: "local",
    });
    expect(result.ai.operations[0]?.status).toBe("PENDING");
    const before = result.tasks.map((task) => task.id);
    const cancelled = await caller().cancelLaunchpadOperation({
      slug: "demo",
      jobId: "job-1",
    });
    expect(cancelled.ai.operations[0]?.status).toBe("CANCELLED");
    expect(cancelled.tasks.map((task) => task.id)).toEqual(before);
  });
  it("retains curated tasks and progress even if a legacy client accepts a draft", async () => {
    const before = (await caller().launchpad({ slug: "demo" })).tasks;
    await generated();
    const active = await caller().acceptLaunchpadDraft({
      slug: "demo",
      jobId: "job-1",
    });
    expect(active.tasks).toEqual(before);
    const task = active.tasks[0]!;
    const completed = await caller().completeLaunchpadTask({
      slug: "demo",
      taskId: task.id,
      complete: true,
    });
    expect(completed.tasks.find((t) => t.id === task.id)?.status).toBe(
      "manual",
    );
    expect(completed.markdown).toContain(task.title);
  });
  it("discards a draft without changing active tasks and rejects stale project evidence", async () => {
    await generated();
    const before = (await caller().launchpad({ slug: "demo" })).tasks;
    const discarded = await caller().discardLaunchpadDraft({
      slug: "demo",
      jobId: "job-1",
    });
    expect(discarded.tasks).toEqual(before);
    await expect(
      caller().acceptLaunchpadDraft({ slug: "demo", jobId: "job-1" }),
    ).rejects.toThrow(/not found/);
    rows.get("p1")!.state.ai!.operations[0]!.discarded = false;
    project.templateVersion = "2.1.0";
    await expect(
      caller().acceptLaunchpadDraft({ slug: "demo", jobId: "job-1" }),
    ).rejects.toThrow(/changed/);
  });
  it("rejects stale brief revisions and secrets before jobs or storage are changed", async () => {
    await confirm();
    await caller().saveLaunchpadBrief({
      slug: "demo",
      answers: { ...answers, journey: "Different goal" },
      summary: "Updated goal",
    });
    await expect(
      caller().confirmLaunchpadBrief({ slug: "demo", revision: 1 }),
    ).rejects.toThrow(/changed/);
    const before = JSON.stringify([...rows]);
    await expect(
      caller().saveLaunchpadBrief({
        slug: "demo",
        answers: { ...answers, setup: "postgresql://user:password@db/app" },
      }),
    ).rejects.toThrow(/credentials/);
    expect(JSON.stringify([...rows])).toBe(before);
    expect(jobs.size).toBe(0);
    for (const secret of [
      "https://alice:password@example.com",
      "password: abcdefghijklmnopqrstuvwxyz123456",
    ]) {
      await expect(
        caller().saveLaunchpadBrief({
          slug: "demo",
          answers: { ...answers, setup: secret },
        }),
      ).rejects.toThrow(/credentials/);
      expect(JSON.stringify([...rows])).toBe(before);
    }
  });
  it("rejects secrets in task questions before creating a job or changing saved state", async () => {
    await confirm();
    const task = (await caller().launchpad({ slug: "demo" })).tasks[0]!;
    const before = JSON.stringify([...rows]);
    for (const message of [
      "https://alice:password@example.com",
      "password: abcdefghijklmnopqrstuvwxyz123456",
      "nvapi-abcdefghijklmnop",
    ]) {
      await expect(
        caller().startLaunchpadOperation({
          slug: "demo",
          kind: "help",
          stage: "local",
          taskId: task.id,
          message,
        }),
      ).rejects.toThrow(/credentials/);
      expect(jobs.size).toBe(0);
      expect(JSON.stringify([...rows])).toBe(before);
    }
  });
  it("does not start removed interview operations", async () => {
    await expect(
      caller().startLaunchpadOperation({
        slug: "demo",
        kind: "interview",
        stage: "local",
      }),
    ).rejects.toThrow(/interview/i);
    expect(jobs.size).toBe(0);
  });
  it("allows help without a brief, keeps it separate from progress and hides malformed output", async () => {
    const task = (await caller().launchpad({ slug: "demo" })).tasks[0]!;
    await caller().startLaunchpadOperation({
      slug: "demo",
      kind: "help",
      stage: "local",
      taskId: task.id,
      message: "Explain this action",
    });
    const job = jobs.get("job-1")!;
    job.status = "SUCCEEDED";
    job.result = {
      output: {
        kind: "help",
        answer: "Start with the supplied service guidance.",
        sourceIds: task.sourceIds!,
      },
    };
    const result = await caller().launchpad({ slug: "demo" });
    expect(result.ai.helpHistory).toHaveLength(1);
    expect(result.summary.completed).toBe(0);
    job.result = {
      output: {
        kind: "help",
        answer: "Run curl https://evil.example",
        sourceIds: task.sourceIds!,
      },
    };
    const failed = await caller().launchpad({ slug: "demo" });
    expect(failed.ai.operations[0]?.status).toBe("FAILED");
    expect(JSON.stringify(failed.ai)).not.toContain("evil.example");
  });
});
