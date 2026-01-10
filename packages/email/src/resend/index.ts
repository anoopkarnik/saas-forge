import {Resend} from 'resend';
import EmailVerification from '../templates/EmailVerification';
import ResetPassword from '../templates/ResetPassword';
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendVerificationEmail = async (email: string, verificationUrl: string) => {
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

  let from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  let subject = "Reset your password";
  return resend.emails.send({
    from,
    to: email,
    subject,
    html: await render(ResetPassword({ resetPasswordLink: resetUrl })),
  });
}

export const sendSupportEmail = async (subject:string,body:string) => {

  try {
    const response = await resend.emails.send({
      from: "feedback@bayesian-labs.com",
      to: "support@bayesian-labs.com",
      subject,
      html: `<p>${body}</p>`
    });
    return response;
  } catch (error) {
    console.log("Error sending email:", error);
    return null;
  }
};


export const createContact = async( email: string) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const response = await resend.contacts.create({
        email: email,
        audienceId: process.env.RESEND_AUDIENCE_ID || "",
    })
    return response
}
