import {
  audit as writeAudit,
  type AuditEventInput,
} from "@workspace/audit/audit";
import type { AuditAction } from "@workspace/audit/actions";
import { getSiteConfig } from "@/lib/site-config/service";

export { userActor } from "@workspace/audit/audit";
export type { AuditActor, AuditEventInput } from "@workspace/audit/audit";

/** Bind runtime site settings to the transaction-scoped module writer. */
export async function audit<A extends AuditAction>(
  client: Parameters<typeof writeAudit>[0],
  action: A,
  event: AuditEventInput<A>,
): Promise<void> {
  const recordRequestDetails = event.headers
    ? (await getSiteConfig())["audit.recordRequestDetails"]
    : false;
  await writeAudit(client, action, event, { recordRequestDetails });
}
