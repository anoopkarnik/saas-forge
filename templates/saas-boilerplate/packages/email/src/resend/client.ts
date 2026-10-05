import { Resend } from 'resend';

/**
 * The Resend client, or null when no email client is configured
 * (NEXT_PUBLIC_EMAIL_CLIENT is not "resend" or RESEND_API_KEY is empty).
 * Production refuses to boot when email sign-up is on without a client
 * (apps/web/lib/env.ts), so null is the local-development path.
 */
export const getResendClient = (): Resend | null => {
  if (process.env.NEXT_PUBLIC_EMAIL_CLIENT !== "resend" || !process.env.RESEND_API_KEY?.trim()) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/** Outside production the link is logged so local sign-ups can still be verified. */
export const warnEmailSkipped = (subject: string, to: string, link?: string) => {
  const detail = link && process.env.NODE_ENV !== "production" ? ` Link: ${link}` : "";
  console.warn(`[email] No email client configured (NEXT_PUBLIC_EMAIL_CLIENT); skipped "${subject}" to ${to}.${detail}`);
}
