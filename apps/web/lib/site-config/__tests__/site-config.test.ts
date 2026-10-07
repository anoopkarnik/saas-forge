// @vitest-environment node
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory AppSetting table and Upstash client.
const { rows, db, redis, redisStore } = vi.hoisted(() => {
  const rows = new Map<string, string>();
  const db = {
    appSetting: {
      findMany: vi.fn(async ({ where }: { where: { key: { in: string[] } } }) =>
        [...rows].filter(([key]) => where.key.in.includes(key)).map(([key, value]) => ({ key, value })),
      ),
      upsert: vi.fn(async ({ where, create }: { where: { key: string }; create: { value: string } }) => {
        rows.set(where.key, create.value);
      }),
      deleteMany: vi.fn(async ({ where }: { where: { key: { in: string[] } } }) => {
        where.key.in.forEach((key) => rows.delete(key));
      }),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const redisStore = new Map<string, unknown>();
  const redis = {
    get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      redisStore.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      redisStore.delete(key);
    }),
  };
  return { rows, db, redis, redisStore };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@/server/redis", () => ({ redis }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

import { assertSafeSettings, publicSiteConfig, SETTINGS, setting } from "@/lib/site-config/registry";
import {
  clearSiteConfigCache,
  getSiteConfig,
  getSiteConfigEntries,
  SiteConfigError,
  updateSiteConfig,
} from "@/lib/site-config/service";
import { siteConfigRouter } from "@/trpc/routers/siteConfigProcedures";

const caller = (role: string | null) =>
  siteConfigRouter.createCaller({
    headers: new Headers(),
    session: role ? { user: { id: "u1", role, email: "a@example.com", name: "A" }, session: { id: "s1" } } : null,
  } as never);

beforeEach(() => {
  rows.clear();
  redisStore.clear();
  clearSiteConfigCache();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "Acme");
  vi.stubEnv("NEXT_PUBLIC_THEME", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_GOOGLE", "true");
  vi.stubEnv("NEXT_PUBLIC_AUTH_GITHUB", "false");
});

describe("getSiteConfig", () => {
  it("with no rows, resolves env and then defaults", async () => {
    const config = await getSiteConfig();
    expect(config["branding.saasName"]).toBe("Acme");
    expect(config["branding.theme"]).toBe("green");
    expect(config["auth.google.visible"]).toBe(true);
    expect(config["auth.github.visible"]).toBe(false);
    expect(config["registration.mode"]).toBe("OPEN");
  });

  it("a stored value overrides env; an invalid one falls back to env", async () => {
    rows.set("branding.saasName", "Globex");
    rows.set("branding.theme", "not-a-colour");
    rows.set("auth.google.visible", "false");

    const config = await getSiteConfig();
    expect(config["branding.saasName"]).toBe("Globex");
    expect(config["branding.theme"]).toBe("green");
    expect(config["auth.google.visible"]).toBe(false);
  });

  it("reads the existing registration_mode row that sign-up enforcement uses", async () => {
    rows.set("registration_mode", "INVITE_ONLY");
    expect((await getSiteConfig())["registration.mode"]).toBe("INVITE_ONLY");
  });

  it("serves later reads from the cache until an update clears it", async () => {
    await getSiteConfig();
    await getSiteConfig();
    expect(db.appSetting.findMany).toHaveBeenCalledTimes(1);

    await updateSiteConfig({ "branding.saasName": "Initech" });
    expect((await getSiteConfig())["branding.saasName"]).toBe("Initech");
  });

  it("uses Redis when it is configured and drops the key on update", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    await getSiteConfig();
    await getSiteConfig();
    expect(db.appSetting.findMany).toHaveBeenCalledTimes(1);
    expect(redis.get).toHaveBeenCalledTimes(2);

    await updateSiteConfig({ "branding.theme": "rose" });
    expect(redis.del).toHaveBeenCalled();
    expect((await getSiteConfig())["branding.theme"]).toBe("rose");
  });

  it("keeps rendering from env when the database is unreachable", async () => {
    db.appSetting.findMany.mockRejectedValueOnce(new Error("no database"));
    expect((await getSiteConfig())["branding.saasName"]).toBe("Acme");
  });
});

describe("updateSiteConfig", () => {
  it("stores strings raw, other values as JSON, under each setting's storage key", async () => {
    await updateSiteConfig({ "registration.mode": "INVITE_ONLY", "auth.github.visible": true });
    expect(rows.get("registration_mode")).toBe("INVITE_ONLY");
    expect(rows.get("auth.github.visible")).toBe("true");
  });

  it("null removes the override so env applies again", async () => {
    await updateSiteConfig({ "branding.saasName": "Globex" });
    await updateSiteConfig({ "branding.saasName": null });
    expect(rows.has("branding.saasName")).toBe(false);
    expect((await getSiteConfig())["branding.saasName"]).toBe("Acme");
  });

  it("rejects unknown keys and invalid values without writing", async () => {
    await expect(updateSiteConfig({ "stripe.secretKey": "sk" } as never)).rejects.toBeInstanceOf(SiteConfigError);
    await expect(updateSiteConfig({ "branding.theme": "plaid" } as never)).rejects.toBeInstanceOf(SiteConfigError);
    expect(rows.size).toBe(0);
  });

  it("entries report where each value comes from", async () => {
    await updateSiteConfig({ "branding.theme": "blue" });
    const entries = await getSiteConfigEntries();
    const byKey = Object.fromEntries(entries.map((entry) => [entry.key, entry.source]));
    expect(byKey["branding.theme"]).toBe("db");
    expect(byKey["branding.saasName"]).toBe("env");
    expect(byKey["registration.mode"]).toBe("default");
  });
});

describe("registry", () => {
  it("refuses a setting whose key or env name looks like a secret", () => {
    const schema = z.string();
    expect(() => assertSafeSettings({ "stripe.secretKey": setting({ schema, default: "", public: false, group: "x", label: "x" }) })).toThrow();
    expect(() =>
      assertSafeSettings({ "auth.client": setting({ schema, default: "", public: false, group: "x", label: "x", env: "NEXT_PUBLIC_API_TOKEN" }) }),
    ).toThrow();
  });

  it("the public view drops every non-public setting", () => {
    const settings = {
      shown: setting({ schema: z.string(), default: "a", public: true, group: "x", label: "x" }),
      hidden: setting({ schema: z.string(), default: "b", public: false, group: "x", label: "x" }),
    };
    expect(publicSiteConfig({ shown: "a", hidden: "b" }, settings)).toEqual({ shown: "a" });
  });
});

describe("siteConfig router", () => {
  it("anyone can read the public config, and it holds only public keys", async () => {
    const config = await caller(null).get();
    const publicKeys = Object.entries(SETTINGS)
      .filter(([, definition]) => definition.public)
      .map(([key]) => key);
    expect(Object.keys(config).sort()).toEqual(publicKeys.sort());
  });

  it("only admins can update; guests can read the entries but not save", async () => {
    await expect(caller(null).update({ "branding.saasName": "X" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller("user").update({ "branding.saasName": "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("guest").update({ "branding.saasName": "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await caller("guest").entries()).not.toHaveLength(0);
    await expect(caller("user").entries()).rejects.toMatchObject({ code: "FORBIDDEN" });

    await caller("admin").update({ "branding.saasName": "X" });
    expect((await caller(null).get())["branding.saasName"]).toBe("X");
  });

  it("maps invalid input to BAD_REQUEST", async () => {
    await expect(caller("admin").update({ "branding.theme": "plaid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
