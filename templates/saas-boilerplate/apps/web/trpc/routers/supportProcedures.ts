import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { sendSupportEmail } from "@workspace/email/resend/index";
import { z } from "zod";

export const supportRouter = createTRPCRouter({
    sendSupportMessage: baseProcedure
    .input(
      z.object({
        subject: z.string().min(1, "Subject is required"),
        email: z.string().email().min(1, "Email is required"),
        message: z.string().min(1, "Message is required"),
      })
    )
    .mutation(async ({ input }) => {
      const { subject, email, message } = input;
      let newSubject = subject + " from " + email + " for " + process.env.NEXT_PUBLIC_SAAS_NAME ; 
      const res = await sendSupportEmail(newSubject,message)


      if (!res) {
        throw new Error("Failed to send support message");
      }

      return { success: true };
    }),
   subscribeToNewsletter: baseProcedure
    .input(
      z.object({

        email: z.string().email().min(1, "Email is required"),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;

      const webhookUrl = process.env.N8N_SUBSCRIBE_NEWSLETTER_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error("Missing N8N_SUBSCRIBE_NEWSLETTER_WEBHOOK_URL");
        throw new Error("Server misconfigured");
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });

      const raw = await res.json();

      if (!res.ok) {
        console.error("n8n error", raw);
        throw new Error("Failed to send support message");
      }

      return { success: true };
    }),
    chatWithSaaSAssistant: baseProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message is required"),
      })
    )
    .mutation(async ({ input }) => {
      const { message } = input;

      const webhookUrl = process.env.N8N_SAAS_ASSISTANT_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error("Missing N8N_SAAS_ASSISTANT_WEBHOOK_URL");
        throw new Error("Server misconfigured");
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        cache: "no-store",
      });

      const raw = await res.json(); // you said n8n returns [{ output: "..." }]

      if (!res.ok) {
        console.error("n8n error", raw);
        throw new Error("Failed to reach assistant");
      }

      let reply: string | null = null;

      // Adjust this depending on your actual n8n response shape
      if (Array.isArray(raw) && raw[0]?.output) {
        reply = raw[0].output as string;
      }

      if (!reply) {
        reply = "Sorry, I didn't get a response from the assistant.";
      }

      return { reply };
    }),
});