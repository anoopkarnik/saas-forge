import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import { FLAGS, type FlagKey } from "@/lib/flags/definitions";
import { evaluateFlags, invalidateFlagCache, sessionSubject } from "@/lib/flags/flags";
import { parseRules, type FlagRule } from "@/lib/flags/rules";
// scaffold:begin audit_log
import { audit, userActor } from "@/lib/audit/audit";
// scaffold:end audit_log

/** Admin side of feature flags: the registry merged with stored state, changes and history. */

export type AdminFlag = {
  key: FlagKey;
  description: string;
  default: boolean;
  /** True once an admin saved it; until then the code default applies. */
  stored: boolean;
  enabled: boolean;
  rules: FlagRule[];
  updatedAt: Date | null;
};

export async function listFlags(): Promise<AdminFlag[]> {
  const rows = await db.featureFlag.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return (Object.keys(FLAGS) as FlagKey[]).map((key) => {
    const row = byKey.get(key);
    return {
      key,
      description: FLAGS[key].description,
      default: FLAGS[key].default,
      stored: !!row,
      enabled: row?.enabled ?? FLAGS[key].default,
      rules: row ? parseRules(row.rules) : [],
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

/** Saves a flag, records the change and clears the cache before returning. */
export async function updateFlag(
  key: FlagKey,
  patch: { enabled?: boolean; rules?: FlagRule[] },
  actorId: string,
  headers?: Pick<Headers, "get"> | null,
): Promise<AdminFlag> {
  const before = await db.featureFlag.findUnique({ where: { key } });
  const enabled = patch.enabled ?? before?.enabled ?? FLAGS[key].default;
  const rules = patch.rules ?? (before ? parseRules(before.rules) : []);
  const after = { enabled, rules };

  await db.$transaction(async (tx) => {
    await tx.featureFlag.upsert({
      where: { key },
      create: { key, description: FLAGS[key].description, enabled, rules: rules as Prisma.InputJsonValue, updatedById: actorId },
      update: { enabled, rules: rules as Prisma.InputJsonValue, updatedById: actorId },
    });
    await tx.featureFlagChange.create({
      data: {
        flagKey: key,
        before: before ? ({ enabled: before.enabled, rules: parseRules(before.rules) } as Prisma.InputJsonValue) : undefined,
        after: after as Prisma.InputJsonValue,
        actorId,
      },
    });
    // scaffold:begin audit_log
    await audit(tx, "flag.updated", { actor: userActor(actorId), targetId: key, metadata: { enabled, rules: rules.length }, headers });
    // scaffold:end audit_log
  });
  await invalidateFlagCache();
  return (await listFlags()).find((flag) => flag.key === key)!;
}

export type FlagChange = { id: string; at: Date; actorEmail: string | null; enabled: boolean; ruleCount: number };

export async function flagHistory(key: FlagKey, limit = 50): Promise<FlagChange[]> {
  const changes = await db.featureFlagChange.findMany({ where: { flagKey: key }, orderBy: { at: "desc" }, take: limit });
  const actorIds = [...new Set(changes.map((change) => change.actorId).filter((id): id is string => !!id))];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } }) : [];
  const emails = new Map(actors.map((actor) => [actor.id, actor.email]));
  return changes.map((change) => {
    const after = (change.after ?? {}) as { enabled?: boolean; rules?: unknown[] };
    return {
      id: change.id,
      at: change.at,
      actorEmail: change.actorId ? (emails.get(change.actorId) ?? null) : null,
      enabled: !!after.enabled,
      ruleCount: Array.isArray(after.rules) ? after.rules.length : 0,
    };
  });
}

/** "As this user → on/off" for every flag, using the saved rules. Null when the user does not exist. */
export async function previewFlagsFor(userIdOrEmail: string) {
  const user = await db.user.findFirst({
    where: userIdOrEmail.includes("@") ? { email: userIdOrEmail.toLowerCase() } : { id: userIdOrEmail },
    select: { id: true, email: true, role: true },
  });
  if (!user) return null;
  // The user's most recent session carries their active organization.
  const session = await db.session.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  const subject = await sessionSubject({ user: { id: user.id, role: user.role }, session });
  return { user: { id: user.id, email: user.email }, flags: await evaluateFlags(subject) };
}
