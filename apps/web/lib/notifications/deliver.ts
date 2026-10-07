import { z } from "zod";
import db from "@workspace/database/client";
import { sendNotificationEmail } from "@workspace/email/resend/notification";
import { defineJob } from "@workspace/jobs/index";

/** Emails one notification (a job, so a Resend error is retried). */
export const deliverNotificationJob = defineJob(
  "notification.deliver",
  z.object({ userId: z.string(), title: z.string(), body: z.string(), link: z.string().nullable() }),
  async ({ userId, title, body, link }) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return;
    const url = link ? new URL(link, process.env.NEXT_PUBLIC_URL || "http://localhost:3000").toString() : null;
    const result = await sendNotificationEmail({ email: user.email, title, body, link: url });
    if (result?.error) throw new Error(`Resend: ${result.error.message}`);
  },
);
