import {Resend} from 'resend';
import EmailVerification from '../templates/EmailVerification';
import ResetPassword from '../templates/ResetPassword';
import { render } from "@react-email/render";

export const sendVerificationEmail = async (email: string, verificationUrl: string) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
    const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
    const subject = "Verify Your Email Address";
    const html = await render(EmailVerification({ verificationLink: verificationUrl, company }))
    return resend.emails.send({
        from: from,
        to: email,
        subject: subject,
        html: html,
    })
}

export const sendResetEmail = async (email: string, resetUrl: string) => {
  const resend = new Resend(process.env.RESEND_API_KEY)

  let from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  let subject = "Reset your password";
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";
  const html = await render(ResetPassword({ resetPasswordLink: resetUrl, company }))
  return resend.emails.send({
    from,
    to: email,
    subject,
    html: html,
  });
}

export const sendSupportEmail = async (subject:string,body:string) => {
  const resend = new Resend(process.env.RESEND_API_KEY)
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
    const resend = new Resend(process.env.RESEND_API_KEY)
    const response = await resend.contacts.create({
        email: email,
        audienceId: process.env.RESEND_AUDIENCE_ID || "",
    })
    return response
}
