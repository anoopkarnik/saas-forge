import { defineJob, enqueue, PermanentJobError } from "@workspace/jobs/index";
import { z } from "zod";
import { sendInvitationEmail, sendResetEmail, sendSupportEmail, sendVerificationEmail } from "./resend/index";
// scaffold:begin multi_tenancy
import { sendOrganizationInvitationEmail } from "./resend/organization";
// scaffold:end multi_tenancy

const message = z.discriminatedUnion("template", [
  z.object({ template: z.literal("verification"), email: z.string(), url: z.string() }),
  z.object({ template: z.literal("reset"), email: z.string(), url: z.string() }),
  z.object({ template: z.literal("invitation"), email: z.string(), url: z.string(), company: z.string() }),
  z.object({ template: z.literal("support"), subject: z.string(), body: z.string() }),
  // scaffold:begin multi_tenancy
  z.object({
    template: z.literal("organization-invitation"),
    email: z.string(),
    organizationName: z.string(),
    inviterName: z.string(),
    role: z.string(),
    inviteUrl: z.string(),
  }),
  // scaffold:end multi_tenancy
]);

export type EmailMessage = z.infer<typeof message>;

async function deliver(input: EmailMessage) {
  switch (input.template) {
    case "verification":
      return sendVerificationEmail(input.email, input.url);
    case "reset":
      return sendResetEmail(input.email, input.url);
    case "invitation":
      return sendInvitationEmail(input.email, input.url, input.company);
    case "support":
      return sendSupportEmail(input.subject, input.body);
    // scaffold:begin multi_tenancy
    case "organization-invitation": {
      const { email, organizationName, inviterName, role, inviteUrl } = input;
      return sendOrganizationInvitationEmail({ email, organizationName, inviterName, role, inviteUrl });
    }
    // scaffold:end multi_tenancy
  }
}

/** Sends one email; a Resend error throws so the job is retried. */
export const emailJob = defineJob("email.send", message, async (input) => {
  const result = await deliver(input);
  if (result?.error) throw new Error(`Resend: ${result.error.message}`);
  // Auth emails are skipped (with a warning) when no email client is set up;
  // a support message would be lost, so it fails instead.
  if (!result && input.template === "support") throw new PermanentJobError("Failed to send support message");
});

/** Queues an email (or sends it right away when there is no job queue). */
export function sendEmail(input: EmailMessage): Promise<void> {
  return enqueue(emailJob, input);
}
