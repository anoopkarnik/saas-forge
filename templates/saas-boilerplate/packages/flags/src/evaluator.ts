import { cache } from "react";
import db from "@workspace/database/client";
import { logger } from "@workspace/observability/winston-logger";
import { evaluateFlag, parseRules, type FlagState } from "./rules";
import type { FlagDefinition, FlagSubject } from "./types";

export type FlagCache = {
  read(): Promise<Record<string, FlagState> | null>;
  write(states: Record<string, FlagState>): Promise<unknown>;
  clear(): Promise<unknown>;
};

/** Each evaluator owns its cache; the host supplies the registry and optional shared cache. */
export function createFlagEvaluator<K extends string>(
  definitions: Record<K, FlagDefinition>,
  externalCache?: FlagCache,
) {
  /**
   * Server-side flag evaluation (feature_flags module), the only source of
   * truth: clients receive evaluated booleans, never rules. Without the module
   * this file is a stub that returns each flag's default.
   */

  const MEMORY_TTL_MS = 30_000;

  let memory: { at: number; states: Record<string, FlagState> } | null = null;

  const loadStates = cache(async (): Promise<Record<string, FlagState>> => {
    if (externalCache) {
      try {
        const cached = await externalCache.read();
        if (cached) return cached;
      } catch (error) {
        logger.warn("Flag cache read failed", {
          error: (error as Error).message,
        });
      }
    } else if (memory && Date.now() - memory.at < MEMORY_TTL_MS) {
      return memory.states;
    }

    let states: Record<string, FlagState>;
    try {
      const rows = await db.featureFlag.findMany({
        select: { key: true, enabled: true, rules: true },
      });
      states = Object.fromEntries(
        rows.map((row) => [
          row.key,
          { enabled: row.enabled, rules: parseRules(row.rules) },
        ]),
      );
    } catch (error) {
      // No database (a build, an outage): flags keep their code defaults.
      logger.warn("Flag read failed; using defaults", {
        error: (error as Error).message,
      });
      return {};
    }
    if (externalCache) {
      await externalCache.write(states).catch(() => undefined);
    } else {
      memory = { at: Date.now(), states };
    }
    return states;
  });

  /** Called after every flag change, before the response, so the next read sees it. */
  async function invalidateFlagCache(): Promise<void> {
    memory = null;
    if (externalCache) await externalCache.clear();
  }

  function evaluate(
    key: K,
    states: Record<string, FlagState>,
    subject: FlagSubject,
  ): boolean {
    const state = states[key];
    return state ? evaluateFlag(key, state, subject) : definitions[key].default;
  }

  async function isEnabled(
    key: K,
    subject: FlagSubject = {},
  ): Promise<boolean> {
    return evaluate(key, await loadStates(), subject);
  }

  async function evaluateFlags(
    subject: FlagSubject = {},
  ): Promise<Record<K, boolean>> {
    const states = await loadStates();
    return Object.fromEntries(
      (Object.keys(definitions) as K[]).map((key) => [
        key,
        evaluate(key, states, subject),
      ]),
    ) as Record<K, boolean>;
  }

  type SessionLike =
    | {
        user: { id: string; role?: string | null };
        session?: { id?: string } | null;
      }
    | null
    | undefined;

  async function sessionSubject(
    session: SessionLike,
    anonymousId?: string | null,
  ): Promise<FlagSubject> {
    if (!session) return { anonymousId: anonymousId ?? null };
    let organizationId: string | null = null;
    // scaffold:begin multi_tenancy
    if (session.session?.id) {
      const row = await db.session.findUnique({
        where: { id: session.session.id },
        select: { activeOrganizationId: true },
      });
      organizationId = row?.activeOrganizationId ?? null;
    }
    // scaffold:end multi_tenancy
    return {
      userId: session.user.id,
      role: session.user.role ?? null,
      organizationId,
      anonymousId: anonymousId ?? null,
    };
  }

  return { isEnabled, evaluateFlags, sessionSubject, invalidateFlagCache };
}
export type FlagEvaluator<K extends string> = ReturnType<
  typeof createFlagEvaluator<K>
>;
