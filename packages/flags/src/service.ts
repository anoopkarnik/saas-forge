import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import { parseRules, type FlagRule } from "./rules";
import type { FlagDefinition } from "./types";
import type { FlagEvaluator } from "./evaluator";

export type AdminFlag<K extends string = string> = {
  key: K;
  description: string;
  default: boolean;
  /** True once an admin saved it; until then the code default applies. */
  stored: boolean;
  enabled: boolean;
  rules: FlagRule[];
  updatedAt: Date | null;
};

export type FlagChange = {
  id: string;
  at: Date;
  actorEmail: string | null;
  enabled: boolean;
  ruleCount: number;
};

export function createFlagService<K extends string>(
  definitions: Record<K, FlagDefinition>,
  { evaluateFlags, invalidateFlagCache, sessionSubject }: FlagEvaluator<K>,
  onUpdate?: (
    tx: Prisma.TransactionClient,
    change: {
      key: K;
      enabled: boolean;
      rules: number;
      actorId: string;
      headers?: Pick<Headers, "get"> | null;
    },
  ) => Promise<void>,
) {
  async function listFlags(): Promise<AdminFlag<K>[]> {
    const rows = await db.featureFlag.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return (Object.keys(definitions) as K[]).map((key) => {
      const row = byKey.get(key);
      return {
        key,
        description: definitions[key].description,
        default: definitions[key].default,
        stored: !!row,
        enabled: row?.enabled ?? definitions[key].default,
        rules: row ? parseRules(row.rules) : [],
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  /** Saves a flag, records the change and clears the cache before returning. */
  async function updateFlag(
    key: K,
    patch: { enabled?: boolean; rules?: FlagRule[] },
    actorId: string,
    headers?: Pick<Headers, "get"> | null,
  ): Promise<AdminFlag<K>> {
    const before = await db.featureFlag.findUnique({ where: { key } });
    const enabled =
      patch.enabled ?? before?.enabled ?? definitions[key].default;
    const rules = patch.rules ?? (before ? parseRules(before.rules) : []);
    const after = { enabled, rules };

    await db.$transaction(async (tx) => {
      await tx.featureFlag.upsert({
        where: { key },
        create: {
          key,
          description: definitions[key].description,
          enabled,
          rules: rules as Prisma.InputJsonValue,
          updatedById: actorId,
        },
        update: {
          enabled,
          rules: rules as Prisma.InputJsonValue,
          updatedById: actorId,
        },
      });
      await tx.featureFlagChange.create({
        data: {
          flagKey: key,
          before: before
            ? ({
                enabled: before.enabled,
                rules: parseRules(before.rules),
              } as Prisma.InputJsonValue)
            : undefined,
          after: after as Prisma.InputJsonValue,
          actorId,
        },
      });
      await onUpdate?.(tx, {
        key,
        enabled,
        rules: rules.length,
        actorId,
        headers,
      });
    });
    await invalidateFlagCache();
    return (await listFlags()).find((flag) => flag.key === key)!;
  }

  async function flagHistory(key: K, limit = 50): Promise<FlagChange[]> {
    const changes = await db.featureFlagChange.findMany({
      where: { flagKey: key },
      orderBy: { at: "desc" },
      take: limit,
    });
    const actorIds = [
      ...new Set(
        changes
          .map((change) => change.actorId)
          .filter((id): id is string => !!id),
      ),
    ];
    const actors = actorIds.length
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true },
        })
      : [];
    const emails = new Map(actors.map((actor) => [actor.id, actor.email]));
    return changes.map((change) => {
      const after = (change.after ?? {}) as {
        enabled?: boolean;
        rules?: unknown[];
      };
      return {
        id: change.id,
        at: change.at,
        actorEmail: change.actorId
          ? (emails.get(change.actorId) ?? null)
          : null,
        enabled: !!after.enabled,
        ruleCount: Array.isArray(after.rules) ? after.rules.length : 0,
      };
    });
  }

  /** "As this user → on/off" for every flag, using the saved rules. Null when the user does not exist. */
  async function previewFlagsFor(userIdOrEmail: string) {
    const user = await db.user.findFirst({
      where: userIdOrEmail.includes("@")
        ? { email: userIdOrEmail.toLowerCase() }
        : { id: userIdOrEmail },
      select: { id: true, email: true, role: true },
    });
    if (!user) return null;
    // The user's most recent session carries their active organization.
    const session = await db.session.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    const subject = await sessionSubject({
      user: { id: user.id, role: user.role },
      session,
    });
    return {
      user: { id: user.id, email: user.email },
      flags: await evaluateFlags(subject),
    };
  }

  return { listFlags, updateFlag, flagHistory, previewFlagsFor };
}
