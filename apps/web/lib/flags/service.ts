import { createFlagService } from "@workspace/flags/service";
import { FLAGS, type FlagKey } from "./definitions";
import {
  evaluateFlags,
  invalidateFlagCache,
  sessionSubject,
  isEnabled,
} from "./flags";
// scaffold:begin audit_log
import { audit, userActor } from "@/lib/audit/audit";
// scaffold:end audit_log

export type AdminFlag = import("@workspace/flags/service").AdminFlag<FlagKey>;
export type { FlagChange } from "@workspace/flags/service";
const service = createFlagService(
  FLAGS,
  { evaluateFlags, invalidateFlagCache, sessionSubject, isEnabled },
  // scaffold:begin audit_log
  async (tx, change) =>
    audit(tx, "flag.updated", {
      actor: userActor(change.actorId),
      targetId: change.key,
      metadata: { enabled: change.enabled, rules: change.rules },
      headers: change.headers,
    }),
  // scaffold:end audit_log
);
export const { listFlags, updateFlag, flagHistory, previewFlagsFor } = service;
