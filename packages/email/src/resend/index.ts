import { getResendClient, warnEmailSkipped } from './client';
import EmailVerification from '../templates/EmailVerification';
import ResetPassword from '../templates/ResetPassword';
import Invitation from '../templates/Invitation';
import { render } from "@react-email/render";

export const sendVerificationEmail = async (email: string, verificationUrl: string) => {
    const subject = "Verify Your Email Address";
    const resend = getResendClient()
    if (!resend) {
        warnEmailSkipped(subject, email, verificationUrl);
        return null;
    }
    const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
    const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
    const html = await render(EmailVerification({ verificationLink: verificationUrl, company }))
    return resend.emails.send({
        from: from,
        to: email,
        subject: subject,
        html: html,
    })
}

export const sendResetEmail = async (email: string, resetUrl: string) => {
  let subject = "Reset your password";
  const resend = getResendClient()
  if (!resend) {
    warnEmailSkipped(subject, email, resetUrl);
    return null;
  }

  let from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
  const html = await render(ResetPassword({ resetPasswordLink: resetUrl, company }))
  return resend.emails.send({
    from,
    to: email,
    subject,
    html: html,
  });
}

export const sendInvitationEmail = async (email: string, inviteUrl: string, company: string) => {
  const subject = `You're invited to ${company}`;
  const resend = getResendClient()
  if (!resend) {
    warnEmailSkipped(subject, email, inviteUrl);
    return null;
  }
  const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  const html = await render(Invitation({ inviteLink: inviteUrl, company }))
  return resend.emails.send({
    from,
    to: email,
    subject,
    html,
  });
}

export const sendSupportEmail = async (subject:string,body:string) => {
  const resend = getResendClient()
  if (!resend) {
    warnEmailSkipped(subject, "support");
    return null;
  }
  const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!
  const to = process.env.NEXT_PUBLIC_SUPPORT_MAIL!

  const response = await resend.emails.send({
      from: from,
      to: to,
      subject,
      text: body
  });
  return response;
};


export const createContact = async( email: string) => {
    const resend = getResendClient()
    if (!resend) {
        warnEmailSkipped("newsletter sign-up", email);
        return null;
    }
    const response = await resend.contacts.create({
        email: email,
        audienceId: process.env.RESEND_AUDIENCE_ID || "",
    })
    return response
}
