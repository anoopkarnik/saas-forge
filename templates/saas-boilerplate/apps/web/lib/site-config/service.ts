import { cache } from "react";
import type { z } from "zod";
import db from "@workspace/database/client";
import { logger } from "@workspace/observability/winston-logger";
import { redis } from "@/server/redis";
import {
  publicSiteConfig,
  SETTINGS,
  type PublicSiteConfig,
  type SettingDefinition,
  type SettingKey,
  type SiteConfig,
} from "@/lib/site-config/registry";

/** Bump when the cached shape changes. */
const CACHE_KEY = "site-config:v1";
const REDIS_TTL_SECONDS = 3600;
/** Without Redis each server instance keeps its own copy this long. */
const MEMORY_TTL_MS = 30_000;

type Overrides = Partial<Record<SettingKey, string>>;
export type SiteConfigSource = "db" | "env" | "default";
export type SiteConfigEntry = {
  key: SettingKey;
  value: unknown;
  source: SiteConfigSource;
  group: string;
  label: string;
  description?: string;
  env?: string;
};

export class SiteConfigError extends Error {}

let memory: { at: number; overrides: Overrides } | null = null;

const KEYS = Object.keys(SETTINGS) as SettingKey[];
const definitionOf = (key: SettingKey): SettingDefinition => SETTINGS[key];
const storageKey = (key: SettingKey) => definitionOf(key).storageKey ?? key;
const redisEnabled = () => !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

export function clearSiteConfigCache(): void {
  memory = null;
}

/** Strings are stored as typed; anything else as JSON. */
function decode(schema: z.ZodType, raw: string): { ok: true; value: unknown } | { ok: false } {
  const direct = schema.safeParse(raw);
  if (direct.success) return { ok: true, value: direct.data };
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return { ok: true, value: parsed.data };
  } catch {
    // not JSON
  }
  return { ok: false };
}

const encode = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

async function readOverrides(): Promise<Overrides> {
  const rows = await db.appSetting.findMany({ where: { key: { in: KEYS.map(storageKey) } } });
  const byStorageKey = new Map(rows.map((row) => [row.key, row.value]));
  const overrides: Overrides = {};
  for (const key of KEYS) {
    const value = byStorageKey.get(storageKey(key));
    if (value !== undefined) overrides[key] = value;
  }
  return overrides;
}

// One lookup per server render: the layout and each generateMetadata share it.
const loadOverrides = cache(async (): Promise<Overrides> => {
  if (redisEnabled()) {
    try {
      const cached = await redis.get<Overrides>(CACHE_KEY);
      if (cached) return cached;
    } catch (error) {
      logger.warn("Site config cache read failed", { error: (error as Error).message });
    }
  } else if (memory && Date.now() - memory.at < MEMORY_TTL_MS) {
    return memory.overrides;
  }

  let overrides: Overrides;
  try {
    overrides = await readOverrides();
  } catch (error) {
    // No database (a build, an outage): render from env rather than fail the page.
    logger.warn("Site config read failed; using env", { error: (error as Error).message });
    return {};
  }

  if (redisEnabled()) {
    await redis.set(CACHE_KEY, overrides, { ex: REDIS_TTL_SECONDS }).catch(() => undefined);
  } else {
    memory = { at: Date.now(), overrides };
  }
  return overrides;
});

function resolve(key: SettingKey, overrides: Overrides): { value: unknown; source: SiteConfigSource } {
  const definition = definitionOf(key);
  const stored = overrides[key];
  if (stored !== undefined) {
    const decoded = decode(definition.schema, stored);
    if (decoded.ok) return { value: decoded.value, source: "db" };
  }
  const fromEnv = definition.env ? process.env[definition.env]?.trim() : undefined;
  if (fromEnv) {
    // Boolean toggles follow the old `=== "true"` reads.
    const decoded = decode(definition.schema, fromEnv);
    if (decoded.ok) return { value: decoded.value, source: "env" };
    if (typeof definition.default === "boolean") return { value: false, source: "env" };
  }
  return { value: definition.default, source: "default" };
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const overrides = await loadOverrides();
  return Object.fromEntries(KEYS.map((key) => [key, resolve(key, overrides).value])) as SiteConfig;
}

export async function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  return publicSiteConfig(await getSiteConfig()) as PublicSiteConfig;
}

/** Every setting with its value and where it came from, for the admin page. */
export async function getSiteConfigEntries(): Promise<SiteConfigEntry[]> {
  const overrides = await loadOverrides();
  return KEYS.map((key) => {
    const { group, label, description, env } = definitionOf(key);
    return { key, ...resolve(key, overrides), group, label, description, env };
  });
}

/**
 * Validates and stores a patch; `null` removes the override so env applies
 * again. Clears the cache before returning, so the next read sees the change.
 */
export async function updateSiteConfig(patch: Partial<Record<SettingKey, unknown>>): Promise<SiteConfig> {
  const writes: Array<{ key: string; value: string }> = [];
  const resets: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in SETTINGS)) throw new SiteConfigError(`Unknown setting "${key}".`);
    const settingKey = key as SettingKey;
    if (value === null) {
      resets.push(storageKey(settingKey));
      continue;
    }
    const parsed = definitionOf(settingKey).schema.safeParse(value);
    if (!parsed.success) {
      throw new SiteConfigError(`${definitionOf(settingKey).label}: ${parsed.error.issues[0]?.message ?? "invalid value"}`);
    }
    writes.push({ key: storageKey(settingKey), value: encode(parsed.data) });
  }

  await db.$transaction([
    ...writes.map(({ key, value }) =>
      db.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
    ...(resets.length ? [db.appSetting.deleteMany({ where: { key: { in: resets } } })] : []),
  ]);

  memory = null;
  if (redisEnabled()) await redis.del(CACHE_KEY);
  return getSiteConfig();
}
