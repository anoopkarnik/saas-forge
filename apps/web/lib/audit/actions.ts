import { z } from "zod";

/**
 * Every audited action (audit_log module): the target it names and the
 * metadata it may store. Metadata is redacted, then parsed with the schema,
 * which drops any key it does not list. Audit configuration changes, never
 * per-call usage. Actions of other modules sit in their marker regions.
 */

export type AuditActionDefinition<S extends z.ZodType = z.ZodType> = {
  targetType: string;
  schema: S;
  /** Keys replaced before storage, at any depth; secret-looking keys always are. */
  redact?: string[];
};

function action<S extends z.ZodType>(definition: AuditActionDefinition<S>): AuditActionDefinition<S> {
  return definition;
}

const none = z.object({});
const role = z.union([z.string(), z.array(z.string())]);

export const AUDIT_ACTIONS = {
  "user.created": action({ targetType: "user", schema: z.object({ email: z.string(), role: role.optional() }), redact: ["password"] }),
  "user.updated": action({ targetType: "user", schema: z.object({ fields: z.array(z.string()) }) }),
  "user.role_changed": action({ targetType: "user", schema: z.object({ role }) }),
  "user.banned": action({
    targetType: "user",
    schema: z.object({ reason: z.string().optional(), expiresInSeconds: z.number().optional() }),
  }),
  "user.unbanned": action({ targetType: "user", schema: none }),
  "user.removed": action({ targetType: "user", schema: none }),
  "user.impersonated": action({ targetType: "user", schema: none }),
  "user.password_set": action({ targetType: "user", schema: none, redact: ["newPassword"] }),
  "user.sessions_revoked": action({ targetType: "user", schema: none }),
  "invitation.created": action({ targetType: "invitation", schema: z.object({ email: z.string() }), redact: ["token"] }),
  "invitation.revoked": action({ targetType: "invitation", schema: none }),
  "invitation.resent": action({ targetType: "invitation", schema: z.object({ email: z.string() }), redact: ["token"] }),
  "site_config.updated": action({ targetType: "site_config", schema: z.object({ changes: z.record(z.string(), z.unknown()) }) }),
  "cms.landing_updated": action({ targetType: "landing_page", schema: none }),
  "doc.created": action({ targetType: "doc", schema: z.object({ title: z.string() }) }),
  "doc.updated": action({ targetType: "doc", schema: z.object({ title: z.string().optional() }) }),
  "doc.deleted": action({ targetType: "doc", schema: none }),
  // scaffold:begin multi_tenancy
  "org.updated": action({ targetType: "organization", schema: z.object({ name: z.string() }) }),
  "org.member.invited": action({ targetType: "invitation", schema: z.object({ email: z.string(), role: z.string() }) }),
  "org.invitation.canceled": action({ targetType: "invitation", schema: none }),
  "org.member.role_changed": action({ targetType: "member", schema: z.object({ role: z.string() }) }),
  "org.member.removed": action({ targetType: "member", schema: none }),
  "org.deleted": action({ targetType: "organization", schema: none }),
  // scaffold:end multi_tenancy
  // scaffold:begin api_keys
  "api_key.created": action({
    targetType: "api_key",
    schema: z.object({ label: z.string(), keyPrefix: z.string(), scopes: z.array(z.string()) }),
    redact: ["plaintext", "keyHash"],
  }),
  "api_key.revoked": action({ targetType: "api_key", schema: none }),
  // scaffold:end api_keys
  // scaffold:begin feature_flags
  "flag.updated": action({ targetType: "feature_flag", schema: z.object({ enabled: z.boolean(), rules: z.number() }) }),
  // scaffold:end feature_flags
  // scaffold:begin ai
  "ai.prompt.created": action({ targetType: "prompt_version", schema: z.object({ version: z.number().optional() }) }),
  "ai.prompt.updated": action({ targetType: "prompt_version", schema: none }),
  "ai.prompt.deleted": action({ targetType: "prompt_version", schema: none }),
  "ai.prompt.activated": action({ targetType: "prompt_version", schema: none }),
  // scaffold:end ai
};

export type AuditAction = keyof typeof AUDIT_ACTIONS;
export type AuditMetadata<A extends AuditAction> = z.input<(typeof AUDIT_ACTIONS)[A]["schema"]>;

const SECRET_KEY = /password|secret|token|plaintext|hash/i;
export const REDACTED = "[redacted]";

/** Replaces listed and secret-looking keys at any depth. */
export function redact(value: unknown, keys: string[] = []): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item, keys));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        keys.includes(key) || SECRET_KEY.test(key) ? REDACTED : redact(inner, keys),
      ]),
    );
  }
  return value;
}

/** The metadata as stored: redacted, then reduced to the keys the action's schema lists. */
export function storedMetadata<A extends AuditAction>(name: A, metadata: AuditMetadata<A>): Record<string, unknown> {
  const definition: AuditActionDefinition = AUDIT_ACTIONS[name];
  return definition.schema.parse(redact(metadata, definition.redact)) as Record<string, unknown>;
}
