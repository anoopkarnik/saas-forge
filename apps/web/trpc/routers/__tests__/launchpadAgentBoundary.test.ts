// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCContext } from "@/trpc/init";

const { createJob, dispatch, send } = vi.hoisted(() => ({
  createJob: vi.fn(async () => ({ id: "job-1" })),
  dispatch: vi.fn(async () => {}),
  send: vi.fn(async () => {}),
}));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));
vi.mock("@workspace/database/client", () => ({
  default: { aiJobRun: { create: createJob } },
}));
vi.mock("@/lib/ai-jobs/service", () => ({
  dispatchAiJob: dispatch,
  cancelAiJob: vi.fn(),
}));
vi.mock("@workspace/jobs/inngest", () => ({ inngest: { send } }));

import { aiJobsRouter } from "../aiJobsProcedures";

const context = {
  headers: new Headers(),
  session: {
    user: {
      id: "owner",
      role: "user",
      email: "owner@example.com",
      name: "Owner",
    },
  },
} as TRPCContext;

beforeEach(() => vi.clearAllMocks());

describe("Launchpad agent cannot bypass project ownership through generic jobs", () => {
  it("rejects launchpad_v1 before persisting or dispatching a generic job", async () => {
    const caller = aiJobsRouter.createCaller(context);
    await expect(
      caller.create({
        agentId: "launchpad_v1",
        input: { projectId: "other-owner-project" },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Use the project's Launchpad to request guidance.",
    });
    expect(createJob).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
