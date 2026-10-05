import { render } from "@react-email/render";
import { getResendClient, warnEmailSkipped } from './client';
import ReleaseNotes, { type ReleaseNotesProject } from '../templates/ReleaseNotes';

/**
 * Root-only: tells an opted-in owner what a release changed in their projects.
 * Returns true once Resend accepted the email.
 */
export const sendReleaseEmail = async ({
  email,
  version,
  highlights,
  projects,
  upgradeLink,
}: {
  email: string;
  version: string;
  highlights: string[];
  projects: ReleaseNotesProject[];
  upgradeLink: string;
}): Promise<boolean> => {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "SaaS Forge";
  const subject = `${company} ${version}: what changed in your projects`;
  const resend = getResendClient();
  if (!resend) {
    warnEmailSkipped(subject, email);
    return false;
  }
  const html = await render(ReleaseNotes({ version, highlights, projects, upgradeLink, company }));
  const { error } = await resend.emails.send({
    from: process.env.NEXT_PUBLIC_SUPPORT_MAIL!,
    to: email,
    subject,
    html,
  });
  return !error;
}
