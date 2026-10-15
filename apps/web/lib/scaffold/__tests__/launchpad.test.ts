// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildLaunchpadTasks,
  renderLaunchpadMarkdown,
} from "../launchpad/catalog";
import {
  sanitizeDoctorReport,
  validateDoctorReport,
} from "../launchpad/report";
import {
  buildLaunchpad,
  completeTask,
  importReport,
  savePreferences,
} from "../launchpad/state";

const project = {
  name: "Demo",
  slug: "demo",
  modules: ["billing"],
  platforms: ["web"],
  templateVersion: "2.0.0",
  config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe" },
};
const report = {
  modules: ["billing"],
  platforms: ["web"],
  checks: [{ group: "services" as const, id: "stripe", status: "ok" as const }],
};

describe("Launchpad journey", () => {
  it("shows only selected providers and platforms, with three presentations of each task", () => {
    const tasks = buildLaunchpadTasks(project, "vercel");
    expect(tasks.some((task) => task.id === "local.stripe")).toBe(true);
    expect(tasks.some((task) => task.id.includes("dodo"))).toBe(false);
    expect(tasks.some((task) => task.id.startsWith("desktop."))).toBe(false);
    expect(tasks.some((task) => task.id.startsWith("mobile."))).toBe(false);
    for (const task of tasks) {
      expect(task.presentations.founder.length).toBeGreaterThan(0);
      expect(task.presentations.builder.length).toBeGreaterThan(0);
      expect(task.presentations.developer.length).toBeGreaterThan(0);
    }
  });
  it("covers native clients and the Python companion only when selected", () => {
    const tasks = buildLaunchpadTasks(
      {
        ...project,
        modules: ["ai", "ai_agents"],
        platforms: ["web", "desktop", "mobile"],
      },
      "docker",
    );
    expect(tasks.map((t) => t.id)).toEqual(
      expect.arrayContaining([
        "desktop.run",
        "desktop.release",
        "mobile.run",
        "mobile.release",
        "local.backend",
        "launch.docker",
      ]),
    );
    expect(
      buildLaunchpadTasks(project, "vercel").some(
        (t) => t.id === "local.backend",
      ),
    ).toBe(false);
    expect(tasks.some((t) => t.id === "launch.vercel")).toBe(false);
  });
  it("does not give stale presets authority over the saved provider selection", () => {
    const tasks = buildLaunchpadTasks(
      { ...project, config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo" } },
      "vercel",
    );
    expect(tasks.map((t) => t.id)).toContain("local.dodo");
    expect(tasks.some((t) => t.id.includes("stripe"))).toBe(false);
  });
  it("renders the same journey as Markdown, including native and production tasks", () => {
    const input = { ...project, platforms: ["web", "mobile"] };
    const markdown = renderLaunchpadMarkdown(input, "vercel", "builder");
    expect(markdown).toContain("Run locally");
    expect(markdown).toContain("Build your MVP");
    expect(markdown).toContain("Backups and restore");
    expect(markdown).toContain("eas-cli");
    expect(markdown).not.toContain("docker:up");
    expect(markdown).not.toContain("Agent prompt:");
    expect(markdown).not.toContain("task prompt below");
  });
});

describe("doctor report boundary", () => {
  it("strips messages, credentials and arbitrary fields before transmission", () => {
    const clean = sanitizeDoctorReport(
      {
        ...report,
        secret: "sk_live_private",
        checks: [
          {
            ...report.checks[0],
            message: "postgres://secret",
            data: { token: "secret" },
          },
        ],
      },
      project,
    );
    expect(clean).toEqual(report);
    expect(JSON.stringify(clean)).not.toContain("secret");
  });
  it("allows recognized env failures but never infers a pass from missing checks", () => {
    const clean = sanitizeDoctorReport(
      {
        ...report,
        checks: [
          {
            group: "env",
            id: "DATABASE_URL",
            status: "fail",
            message: "secret",
          },
        ],
      },
      project,
    );
    expect(clean.checks).toEqual([
      { group: "env", id: "DATABASE_URL", status: "fail" },
    ]);
    const result = buildLaunchpad(
      project,
      importReport(project, null, clean, "local"),
    );
    expect(result.tasks.find((t) => t.id === "local.postgres")?.status).toBe(
      "not_checked",
    );
  });
  it.each([
    { ...report, modules: [] },
    { ...report, platforms: ["mobile"] },
    { ...report, checks: [{ group: "services", id: "dodo", status: "ok" }] },
    {
      ...report,
      checks: [{ group: "services", id: "stripe", status: "great" }],
    },
  ])(
    "rejects incompatible or malformed reports without saving them",
    (input) => {
      expect(() => validateDoctorReport(input, project)).toThrow();
    },
  );
  it("honors shipped defaults and accepts their checks for sparse saved configs", () => {
    const sparse = { ...project, modules: [], config: {} };
    const checks = [
      { group: "env", id: "BLOB_READ_WRITE_TOKEN", status: "fail" },
      { group: "env", id: "UPSTASH_REDIS_REST_TOKEN", status: "fail" },
    ];
    expect(
      sanitizeDoctorReport({ modules: [], platforms: ["web"], checks }, sparse)
        .checks,
    ).toEqual(checks);
    const tasks = buildLaunchpadTasks(sparse, "vercel");
    expect(tasks.map((t) => t.id)).toEqual(
      expect.arrayContaining(["local.vercel_blob", "local.upstash"]),
    );
  });
  it("accepts the always-shipped web foundation in reports for native-only selections", () => {
    const native = { ...project, platforms: ["mobile"] };
    const imported = validateDoctorReport(
      { ...report, platforms: ["web", "mobile"] },
      native,
    );
    expect(imported.platforms).toEqual(["web", "mobile"]);
  });
  it("accepts missing and malformed sender checks from authentic Resend reports", () => {
    const emailProject = {
      ...project,
      config: { ...project.config, NEXT_PUBLIC_EMAIL_CLIENT: "resend" },
    };
    const imported = sanitizeDoctorReport(
      {
        ...report,
        checks: [
          {
            group: "env",
            id: "NEXT_PUBLIC_SUPPORT_MAIL",
            status: "fail",
            message: "missing sender",
          },
        ],
      },
      emailProject,
    );
    expect(imported.checks).toEqual([
      { group: "env", id: "NEXT_PUBLIC_SUPPORT_MAIL", status: "fail" },
    ]);
  });
  it("rechecks integration acceptance when module or provider choices change", () => {
    let state = completeTask(project, null, "curated:launch.smoke.1", true);
    state = completeTask(
      project,
      state,
      "curated:launch.env.payment-provider",
      true,
    );
    const journey = buildLaunchpad(
      { ...project, config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo" } },
      state,
    );
    expect(
      journey.tasks.find((t) => t.id === "curated:launch.smoke.1")?.status,
    ).toBe("not_checked");
    expect(
      journey.tasks.find((t) => t.id === "curated:launch.env.payment-provider")
        ?.status,
    ).toBe("not_checked");
  });
  it("recognizes flat auth flags saved by API clients", () => {
    const apiProject = {
      ...project,
      config: {
        NEXT_PUBLIC_AUTH_GOOGLE: "true",
        NEXT_PUBLIC_AUTH_GITHUB: "false",
      },
    };
    expect(
      buildLaunchpadTasks(apiProject, "vercel")
        .find((t) => t.id === "launch.auth")
        ?.presentations.developer.join(" "),
    ).toContain("google");
    expect(
      sanitizeDoctorReport(
        {
          ...report,
          checks: [
            { group: "env", id: "AUTH_GOOGLE_CLIENT_SECRET", status: "fail" },
          ],
        },
        apiProject,
      ).checks,
    ).toHaveLength(1);
    expect(() =>
      sanitizeDoctorReport(
        {
          ...report,
          checks: [
            { group: "env", id: "AUTH_GITHUB_CLIENT_SECRET", status: "fail" },
          ],
        },
        apiProject,
      ),
    ).toThrow();
  });
  it("rejects unknown fields and excessive reports on the server", () => {
    expect(() =>
      validateDoctorReport({ ...report, secret: "private" }, project),
    ).toThrow();
    expect(() =>
      validateDoctorReport(
        { ...report, checks: Array(300).fill(report.checks[0]) },
        project,
      ),
    ).toThrow();
  });
});

describe("Launchpad progress", () => {
  it("keeps progress across mode switches", () => {
    const completed = completeTask(
      project,
      null,
      "curated:local.account.postgres",
      true,
    );
    const state = savePreferences(project, completed, { mode: "founder" });
    const journey = buildLaunchpad(project, state);
    expect(journey.mode).toBe("founder");
    expect(
      journey.tasks.find((t) => t.id === "curated:local.account.postgres")
        ?.status,
    ).toBe("manual");
    expect(journey.summary.completed).toBe(1);
  });
  it("isolates local and production evidence", () => {
    const journey = buildLaunchpad(
      project,
      importReport(project, null, report, "local"),
    );
    expect(journey.tasks.find((t) => t.id === "local.stripe")?.status).toBe(
      "passed",
    );
    expect(
      journey.tasks.find((t) => t.id === "production.stripe")?.status,
    ).toBe("not_checked");
    expect(
      journey.tasks.find((t) => t.id === "curated:launch.payments.1")?.status,
    ).toBe("not_checked");
  });
  it("a fresh failed report supersedes an earlier pass, even with manual completion", () => {
    let state = completeTask(project, null, "local.stripe", true);
    state = importReport(project, state, report, "local");
    state = importReport(
      project,
      state,
      {
        ...report,
        checks: [{ group: "services", id: "stripe", status: "fail" }],
      },
      "local",
    );
    expect(
      buildLaunchpad(project, state).tasks.find((t) => t.id === "local.stripe")
        ?.status,
    ).toBe("failed");
  });
  it("invalidates reports on upgrades, preserving unchanged manual tasks", () => {
    let state = completeTask(
      project,
      null,
      "curated:local.account.postgres",
      true,
    );
    state = importReport(project, state, report, "local");
    const journey = buildLaunchpad(
      { ...project, templateVersion: "2.0.1" },
      state,
    );
    expect(journey.tasks.find((t) => t.id === "local.stripe")?.status).toBe(
      "not_checked",
    );
    expect(
      journey.tasks.find((t) => t.id === "curated:local.account.postgres")
        ?.status,
    ).toBe("manual");
    expect(journey.recheckRequired).toBe(true);
  });
  it("resets provider-specific manual tasks when a provider changes", () => {
    const state = completeTask(
      project,
      null,
      "curated:launch.payments.1",
      true,
    );
    const journey = buildLaunchpad(
      { ...project, config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo" } },
      state,
    );
    expect(
      journey.tasks.find((t) => t.id === "curated:launch.payments.1")?.status,
    ).toBe("not_checked");
  });
  it("rechecks cross-platform acceptance after adding a native client", () => {
    let state = completeTask(project, null, "curated:mvp.test.1", true);
    state = completeTask(project, state, "curated:launch.smoke.1", true);
    state = completeTask(project, state, "curated:mvp.define.1", true);
    const journey = buildLaunchpad(
      { ...project, platforms: ["web", "mobile"] },
      state,
    );
    expect(
      journey.tasks.find((t) => t.id === "curated:mvp.test.1")?.status,
    ).toBe("not_checked");
    expect(
      journey.tasks.find((t) => t.id === "curated:launch.smoke.1")?.status,
    ).toBe("not_checked");
    expect(
      journey.tasks.find((t) => t.id === "curated:mvp.define.1")?.status,
    ).toBe("manual");
  });
  it("rejects a task not in this project's journey", () => {
    expect(() => completeTask(project, null, "mobile.release", true)).toThrow();
  });
});
