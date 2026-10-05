import { getResendClient, warnEmailSkipped } from './client';
import { render } from "@react-email/render";
import OrganizationInvitation from '../templates/OrganizationInvitation';

export const sendOrganizationInvitationEmail = async ({
  email,
  organizationName,
  inviterName,
  role,
  inviteUrl,
}: {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}) => {
  const subject = `${inviterName} invited you to ${organizationName}`;
  const resend = getResendClient()
  if (!resend) {
    warnEmailSkipped(subject, email, inviteUrl);
    return null;
  }
  const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
  const html = await render(
    OrganizationInvitation({ organizationName, inviterName, role, inviteLink: inviteUrl, company })
  );
  return resend.emails.send({
    from,
    to: email,
    subject,
    html,
  });
}
