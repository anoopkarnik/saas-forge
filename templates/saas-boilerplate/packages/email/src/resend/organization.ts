import { getResendClient, warnEmailSkipped } from './client';
import { render } from "@react-email/render";
import OrganizationInvitation from '../templates/OrganizationInvitation';
import { createTranslator } from 'use-intl';
import { DEFAULT_LOCALE, type Locale } from '@workspace/i18n/config';
import { getMessages } from '@workspace/i18n/messages';

export const sendOrganizationInvitationEmail = async ({
  email,
  organizationName,
  inviterName,
  role,
  inviteUrl,
  locale = DEFAULT_LOCALE,
}: {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  locale?: Locale;
}) => {
  const t = createTranslator({ locale, messages: getMessages(locale), namespace: 'multi_tenancy.email.invitation' });
  const subject = t('subject', { inviter: inviterName, organization: organizationName });
  const resend = getResendClient()
  if (!resend) {
    warnEmailSkipped(subject, email, inviteUrl);
    return null;
  }
  const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
  const html = await render(
    OrganizationInvitation({ organizationName, inviterName, role, inviteLink: inviteUrl, company, locale })
  );
  return resend.emails.send({
    from,
    to: email,
    subject,
    html,
  });
}
