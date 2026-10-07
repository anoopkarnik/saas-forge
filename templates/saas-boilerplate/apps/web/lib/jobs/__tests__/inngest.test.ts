// @vitest-environment node
import { InngestTestEngine } from "@inngest/test";
import { afterEach, describe, expect, it, vi } from "vitest";

const senders = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(),
  sendResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
  sendSupportEmail: vi.fn(),
}));
vi.mock("@workspace/email/resend/index", () => senders);
vi.mock("@workspace/database/client", () => ({ default: {} }));

import { listJobs } from "@workspace/jobs/index";
import { jobFunctions } from "@/lib/jobs/functions";

afterEach(() => vi.unstubAllEnvs());

describe("Inngest functions", () => {
  it("serves one function per job and per schedule", async () => {
    vi.stubEnv("INNGEST_DEV", "1");
    const { GET } = await import("@/app/api/inngest/route");

    const response = await GET(new Request("http://localhost:3000/api/inngest") as never, undefined as never);
    const body = await response.json();

    // Each job also serves its failure handler (the dead letter).
    const jobs = listJobs().length;
    expect(body.function_count).toBe(jobFunctions().length + jobs);
    expect(jobFunctions().map((fn) => fn.id())).toEqual(
      expect.arrayContaining([
        "email.send",
        "cleanup.expiredInvitations",
        "cleanup.expiredSessions",
        "schedule-daily-invitation-cleanup",
        "schedule-daily-session-cleanup",
      ]),
    );
  });

  it("delivers a queued email when Inngest runs the job", async () => {
    senders.sendVerificationEmail.mockResolvedValue({ data: { id: "e1" }, error: null });
    const emailFn = jobFunctions().find((fn) => fn.id() === "email.send")!;

    const { error } = await new InngestTestEngine({ function: emailFn }).execute({
      events: [
        {
          name: "jobs/email.send",
          data: { payload: { template: "verification", email: "ada@example.com", url: "https://app.test/v" }, version: 1 },
        },
      ],
    });

    expect(error).toBeUndefined();
    expect(senders.sendVerificationEmail).toHaveBeenCalledWith("ada@example.com", "https://app.test/v");
  });
});
