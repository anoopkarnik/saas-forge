import { z } from "zod";
import { exportAuditCsv, listAuditEvents } from "@/lib/audit/service";
import { adminProcedure, createTRPCRouter } from "../init";
// scaffold:begin multi_tenancy
import { orgRoleProcedure } from "../org";
// scaffold:end multi_tenancy

const filters = z.object({
  actor: z.string().trim().max(320).optional(),
  actionPrefix: z.string().trim().max(100).optional(),
  targetType: z.string().trim().max(100).optional(),
  targetId: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
const page = z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) });

// Audit log (audit_log module). Append-only: there is no update or delete
// procedure. Admin-only, not guest-readable: events hold emails and IPs.
export const auditRouter = createTRPCRouter({
  list: adminProcedure
    .input(filters.extend(page.shape))
    .query(({ input: { cursor, limit, ...rest } }) => listAuditEvents(rest, { cursor, limit })),

  exportCsv: adminProcedure.input(filters).query(({ input }) => exportAuditCsv(input)),

  // scaffold:begin multi_tenancy
  /** The active organization's trail, for its admins and owners. */
  orgActivity: orgRoleProcedure("admin")
    .input(page)
    .query(({ ctx, input }) => listAuditEvents({}, { ...input, organizationId: ctx.org.id })),
  // scaffold:end multi_tenancy
});
