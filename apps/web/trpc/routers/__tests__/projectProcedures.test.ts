import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Avoid pulling the presets/lucide-react chain into unit tests.
vi.mock("@/lib/scaffold/setup-guide", () => ({
  generateSetupGuide: vi.fn(() => ({
    accounts: ["PostgreSQL provider"],
    secrets: ["DATABASE_URL"],
    steps: [{ title: "Setup", details: ["do it"] }],
    markdown: "# Setup guide",
  })),
}));

// Keep the template-version reader deterministic.
vi.mock("@/lib/scaffold/template-version", () => ({
  getTemplateVersion: () => "1.4.1",
}));

const { stored, projectConfig } = vi.hoisted(() => {
  const stored = new Map<string, any>();

  function applySelect(row: any, select?: Record<string, boolean>) {
    if (!select) return row;
    const out: any = {};
    for (const key of Object.keys(select)) out[key] = row[key];
    return out;
  }

  function matches(row: any, where: any) {
    return Object.entries(where).every(([k, v]) => row[k] === v);
  }

  const projectConfig = {
    create: vi.fn(async ({ data, select }: any) => {
      const row = {
        id: `p${stored.size + 1}`,
        lastBuiltHash: null,
        lastBuiltAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      stored.set(row.id, row);
      return applySelect(row, select);
    }),
    findMany: vi.fn(async ({ where, select }: any) =>
      [...stored.values()]
        .filter((r) => matches(r, where))
        .map((r) => applySelect(r, select)),
    ),
    findFirst: vi.fn(async ({ where, select }: any) => {
      for (const r of stored.values()) {
        if (matches(r, where)) return applySelect(r, select);
      }
      return null;
    }),
    update: vi.fn(async ({ where, data, select }: any) => {
      const row = stored.get(where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data, { updatedAt: new Date() });
      return applySelect(row, select);
    }),
    deleteMany: vi.fn(async ({ where }: any) => {
      let count = 0;
      for (const [id, r] of [...stored.entries()]) {
        if (matches(r, where)) {
          stored.delete(id);
          count++;
        }
      }
      return { count };
    }),
  };

  return { stored, projectConfig };
});

vi.mock("@workspace/database/client", () => {
  // No owned builds: downloads cost full price.
  const client: any = { projectConfig, scaffoldJob: { findFirst: async () => null } };
  client.$extends = () => client;
  return { default: client };
});

import { projectRouter } from "../projectProcedures";

const ctx = {
  headers: new Headers(),
  session: {
    user: { id: "u1", role: "user", email: "u1@example.com", name: "u" },
  },
} as any;

describe("project router", () => {
  beforeEach(() => {
    stored.clear();
    vi.clearAllMocks();
  });

  it("save strips secret env values and persists only non-secret config", async () => {
    const caller = projectRouter.createCaller(ctx);
    const res = await caller.save({
      name: "My App",
      tierId: "tier-1",
      versionId: "balanced",
      platforms: ["web"],
      modules: ["billing"],
      config: {
        NEXT_PUBLIC_THEME: "green",
        DATABASE_URL: "postgres://secret",
        STRIPE_SECRET_KEY: "sk_live_xxx",
        AUTH_GITHUB_CLIENT_SECRET: "ghs_xxx",
      },
    });

    expect(res.project.config).toEqual({ NEXT_PUBLIC_THEME: "green" });
    expect(res.strippedKeys).toEqual(
      expect.arrayContaining([
        "DATABASE_URL",
        "STRIPE_SECRET_KEY",
        "AUTH_GITHUB_CLIENT_SECRET",
      ]),
    );
    expect(res.project.templateVersion).toBe("1.4.1");
  });

  it("save rejects unknown modules but allows now-enabled ones", async () => {
    const caller = projectRouter.createCaller(ctx);
    await expect(
      caller.save({ name: "x", modules: ["does_not_exist"] }),
    ).rejects.toThrow();

    // multi_tenancy is downloadEnabled again
    const ok = await caller.save({ name: "teams app", modules: ["multi_tenancy"] });
    expect(ok.project.modules).toEqual(["multi_tenancy"]);
  });

  it("save generates a unique slug per user on collision", async () => {
    const caller = projectRouter.createCaller(ctx);
    const a = await caller.save({ name: "Same Name" });
    const b = await caller.save({ name: "Same Name" });
    expect(a.project.slug).toBe("same-name");
    expect(b.project.slug).toBe("same-name-2");
  });

  it("list returns only this user's projects without the config blob", async () => {
    const caller = projectRouter.createCaller(ctx);
    await caller.save({ name: "Mine" });
    stored.set("foreign", {
      id: "foreign",
      userId: "other",
      name: "Theirs",
      slug: "theirs",
      tierId: "tier-1",
      versionId: "balanced",
      platforms: ["web"],
      modules: [],
      config: { secret: true },
      templateVersion: "1.4.1",
    });

    const rows = await caller.list();
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).config).toBeUndefined();
  });

  it("get 404s on another user's project", async () => {
    const caller = projectRouter.createCaller(ctx);
    stored.set("foreign", {
      id: "foreign",
      userId: "other",
      name: "Theirs",
      slug: "theirs",
      tierId: "tier-1",
      versionId: "balanced",
      platforms: ["web"],
      modules: [],
      config: {},
      templateVersion: "1.4.1",
    });
    await expect(caller.get({ slug: "theirs" })).rejects.toThrow();
  });

  it("delete removes the user's project and 404s when missing", async () => {
    const caller = projectRouter.createCaller(ctx);
    const saved = await caller.save({ name: "Trash Me" });
    const del = await caller.delete({ slug: saved.project.slug });
    expect(del.deleted).toBe(1);
    await expect(caller.delete({ slug: saved.project.slug })).rejects.toThrow();
  });

  it("estimateDownload charges base + implemented module credits (0 for empty modules)", async () => {
    const caller = projectRouter.createCaller(ctx);
    const withBilling = await caller.save({ name: "Paid", modules: ["billing"] });
    const est1 = await caller.estimateDownload({ slug: withBilling.project.slug });
    expect(est1.fullCredits).toBe(30); // base 20 + billing 10

    const withEmpty = await caller.save({ name: "Empty", modules: ["api_keys"] });
    const est2 = await caller.estimateDownload({ slug: withEmpty.project.slug });
    expect(est2.fullCredits).toBe(20); // api_keys not implemented -> 0

    const withTeams = await caller.save({ name: "Teams", modules: ["multi_tenancy"] });
    const est3 = await caller.estimateDownload({ slug: withTeams.project.slug });
    expect(est3.fullCredits).toBe(70); // base 20 + multi_tenancy 50
  });

  it("estimateUpgrade computes module delta plus tier-step credits", async () => {
    const caller = projectRouter.createCaller(ctx);
    const saved = await caller.save({
      name: "Grow",
      tierId: "tier-1",
      modules: [],
    });

    const est = await caller.estimateUpgrade({
      slug: saved.project.slug,
      targetModules: ["billing"],
      targetTierId: "tier-3",
    });

    expect(est.addedModules).toEqual(["billing"]);
    expect(est.moduleCredits).toBe(10);
    expect(est.tierSteps).toBe(2);
    expect(est.tierCredits).toBe(6); // 2 steps * 3
    expect(est.deltaCredits).toBe(16);
  });
});
