import { render } from "@react-email/render";
import { getResendClient, warnEmailSkipped } from './client';
import Notification from '../templates/Notification';

/** Emails one notification. Returns the Resend result, or null when no email client is set up. */
export const sendNotificationEmail = async ({
  email,
  title,
  body,
  link,
}: {
  email: string;
  title: string;
  body: string;
  link?: string | null;
}) => {
  const resend = getResendClient();
  if (!resend) {
    warnEmailSkipped(title, email, link ?? undefined);
    return null;
  }
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
  const html = await render(Notification({ title, body, link, company }));
  return resend.emails.send({ from: process.env.NEXT_PUBLIC_SUPPORT_MAIL!, to: email, subject: title, html });
}
