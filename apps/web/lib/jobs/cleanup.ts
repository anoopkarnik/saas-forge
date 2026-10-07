import { z } from "zod";
import db from "@workspace/database/client";
import { defineJob, defineSchedule } from "@workspace/jobs/index";
// scaffold:begin billing
import { logger } from "@workspace/observability/winston-logger";
import { findUsageDrift } from "@/lib/usage/service";
// scaffold:end billing
// scaffold:begin audit_log
import { deleteAuditEventsOlderThan } from "@/lib/audit/service";
import { getSiteConfig } from "@/lib/site-config/service";
// scaffold:end audit_log

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

// scaffold:begin billing
/** Reports users whose usage ledger no longer adds up to creditsUsed (it never corrects them). */
export const reconcileUsageLedger = defineJob("usage.reconcile", z.object({}), async () => {
  const drift = await findUsageDrift();
  if (drift.length > 0) logger.warn("Usage ledger drift", { users: drift.length, sample: drift.slice(0, 20) });
});

defineSchedule("daily-usage-reconcile", "45 3 * * *", reconcileUsageLedger);
// scaffold:end billing

// scaffold:begin audit_log
/** Audit events older than the retention set in /admin/settings (0 keeps them forever). */
export const cleanupAuditRetention = defineJob("cleanup.auditRetention", z.object({}), async () => {
  await deleteAuditEventsOlderThan((await getSiteConfig())["audit.retentionDays"]);
});

defineSchedule("daily-audit-retention", "30 3 * * *", cleanupAuditRetention);
// scaffold:end audit_log
