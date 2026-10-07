import { z } from "zod";
import db from "@workspace/database/client";
import { defineJob, defineSchedule } from "@workspace/jobs/index";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Pending invitations that expired over 30 days ago (admins can still re-send recent ones). */
export const cleanupExpiredInvitations = defineJob("cleanup.expiredInvitations", z.object({}), async () => {
  await db.invitation.deleteMany({
    where: { status: "PENDING", expiresAt: { lt: new Date(Date.now() - 30 * DAY_MS) } },
  });
});

/** Sessions past their expiry, which sign-in never reads again. */
export const cleanupExpiredSessions = defineJob("cleanup.expiredSessions", z.object({}), async () => {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
});

defineSchedule("daily-invitation-cleanup", "0 3 * * *", cleanupExpiredInvitations);
defineSchedule("daily-session-cleanup", "15 3 * * *", cleanupExpiredSessions);
