import { beforeEach, describe, expect, it, vi } from "vitest";

const senders = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(),
  sendResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
  sendSupportEmail: vi.fn(),
}));
vi.mock("./resend/index", () => senders);

import { runInline } from "@workspace/jobs/index";
import { emailJob, sendEmail } from "./jobs";

beforeEach(() => vi.clearAllMocks());

describe("email.send", () => {
  it("sends right away when there is no job queue", async () => {
    senders.sendVerificationEmail.mockResolvedValue({ data: { id: "e1" }, error: null });

    await sendEmail({ template: "verification", email: "ada@example.com", url: "https://app.test/verify" });

    expect(senders.sendVerificationEmail).toHaveBeenCalledWith("ada@example.com", "https://app.test/verify");
  });

  it("retries when Resend reports an error", async () => {
    senders.sendResetEmail
      .mockResolvedValueOnce({ data: null, error: { message: "rate limited" } })
      .mockResolvedValue({ data: { id: "e2" }, error: null });

    await runInline(emailJob, { template: "reset", email: "ada@example.com", url: "u" }, { wait: async () => {} });

    expect(senders.sendResetEmail).toHaveBeenCalledTimes(2);
  });

  it("fails a support message at once when no email client is set up", async () => {
    senders.sendSupportEmail.mockResolvedValue(null);

    await expect(sendEmail({ template: "support", subject: "Help", body: "Hi" })).rejects.toThrow(
      "Failed to send support message",
    );
    expect(senders.sendSupportEmail).toHaveBeenCalledOnce();
  });
});
