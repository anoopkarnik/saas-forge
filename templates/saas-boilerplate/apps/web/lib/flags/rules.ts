import { createHash } from "node:crypto";
import { z } from "zod";
import type { FlagSubject } from "@/lib/flags/definitions";

/** Flag rules, evaluated in order: the first that matches decides; otherwise the flag's `enabled`. */
export const ruleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("role"), roles: z.array(z.string().trim().min(1)).min(1).max(20), value: z.boolean() }),
  z.object({ type: z.literal("user"), userIds: z.array(z.string().trim().min(1)).min(1).max(500), value: z.boolean() }),
  // scaffold:begin multi_tenancy
  z.object({
    type: z.literal("organization"),
    organizationIds: z.array(z.string().trim().min(1)).min(1).max(500),
    value: z.boolean(),
  }),
  // scaffold:end multi_tenancy
  /** On for this share of subjects, stable per subject; the rest fall through. */
  z.object({ type: z.literal("percentage"), percent: z.number().min(0).max(100) }),
]);
export const rulesSchema = z.array(ruleSchema).max(20);

export type FlagRule = z.infer<typeof ruleSchema>;
export type FlagState = { enabled: boolean; rules: FlagRule[] };

/** 0 ≤ bucket < 100, the same for a flag and subject on every evaluation. */
export function bucket(flagKey: string, subjectId: string): number {
  const hash = createHash("sha256").update(`${flagKey}:${subjectId}`).digest();
  return (hash.readUInt32BE(0) % 10_000) / 100;
}

function ruleValue(flagKey: string, rule: FlagRule, subject: FlagSubject): boolean | undefined {
  switch (rule.type) {
    case "role":
      return subject.role && rule.roles.includes(subject.role) ? rule.value : undefined;
    case "user":
      return subject.userId && rule.userIds.includes(subject.userId) ? rule.value : undefined;
    // scaffold:begin multi_tenancy
    case "organization":
      return subject.organizationId && rule.organizationIds.includes(subject.organizationId) ? rule.value : undefined;
    // scaffold:end multi_tenancy
    case "percentage": {
      const id = subject.userId ?? subject.anonymousId;
      return id && bucket(flagKey, id) < rule.percent ? true : undefined;
    }
  }
}

export function evaluateFlag(flagKey: string, state: FlagState, subject: FlagSubject): boolean {
  for (const rule of state.rules) {
    const value = ruleValue(flagKey, rule, subject);
    if (value !== undefined) return value;
  }
  return state.enabled;
}

/** Stored rules that no longer parse (e.g. a removed rule type) are ignored, never thrown. */
export function parseRules(value: unknown): FlagRule[] {
  const parsed = rulesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
