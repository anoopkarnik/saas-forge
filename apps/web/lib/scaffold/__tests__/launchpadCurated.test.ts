// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildCuratedTasks } from "../launchpad/curated";
import { buildLaunchpadTasks, projectEnvKeys } from "../launchpad/catalog";
import {
  buildLaunchpad,
  completeTask,
  defaultLaunchpadState,
  importReport,
} from "../launchpad/state";
import { renderWalkthroughMarkdown } from "../launchpad/ai-state";

const project = {
  name: "Demo",
  slug: "demo",
  modules: ["billing", "ai", "ai_agents", "jobs", "webhooks"],
  platforms: ["web", "desktop", "mobile"],
  templateVersion: "2.0.0",
  config: {
    NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo",
    NEXT_PUBLIC_EMAIL_CLIENT: "resend",
    NEXT_PUBLIC_IMAGE_STORAGE: "cloudflare_r2",
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    NEXT_PUBLIC_AUTH_PROVIDERS: ["google", "linkedin"],
    NEXT_PUBLIC_AI_ENABLED: "true",
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: [
      "logging",
      "ga4_reports",
      "pagespeed_insights",
    ],
  },
};

describe("curated Launchpad", () => {
  it("provides detailed deterministic tasks with relevant source links for every applicable anchor and setting", () => {
    const tasks = buildCuratedTasks(project, "vercel");
    expect(buildCuratedTasks(project, "vercel")).toEqual(tasks);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    for (const anchor of buildLaunchpadTasks(project, "vercel"))
      expect(tasks.some((t) => (t.anchorId ?? t.id) === anchor.id)).toBe(true);
    for (const key of projectEnvKeys(project))
      expect(
        tasks
          .filter((t) => t.stage === "local")
          .some((t) => t.presentations.builder.join(" ").includes(key)),
      ).toBe(true);
    for (const task of tasks) {
      expect(task.links.length).toBeGreaterThan(0);
      expect(task.presentations.builder.length).toBeGreaterThan(1);
      expect(task.acceptance.length).toBeGreaterThan(0);
      expect(task.id.length).toBeLessThanOrEqual(100);
    }
    expect(
      tasks
        .find((t) => t.id === "curated:local.account.dodo")!
        .links.some((l) => l.url.startsWith("https://docs.dodopayments.com/")),
    ).toBe(true);
    expect(
      tasks
        .find((t) => t.id === "curated:local.account.resend")!
        .links.some((l) => l.url.startsWith("https://resend.com/docs/")),
    ).toBe(true);
    expect(tasks.some((t) => t.id === "curated:local.account.stripe")).toBe(
      false,
    );
    expect(tasks.some((t) => t.id === "curated:launch.docker")).toBe(false);
  });
  it("shows the same curated guide in UI and Markdown with persistent manual progress and scoped checks", () => {
    const guide = buildLaunchpad(project, null);
    const first = guide.tasks[0]!;
    const state = completeTask(project, null, first.id, true);
    expect(buildLaunchpad(project, state).tasks[0]!.status).toBe("manual");
    const md = renderWalkthroughMarkdown(project, state);
    for (const task of guide.tasks) {
      expect(md).toContain(task.title);
      for (const link of task.links) expect(md).toContain(link.url);
    }
    const report = importReport(
      project,
      state,
      {
        modules: project.modules,
        platforms: project.platforms,
        checks: [{ group: "services", id: "dodo", status: "ok" }],
      },
      "local",
    );
    const verified = buildLaunchpad(project, report);
    expect(verified.tasks.find((t) => t.id === "local.dodo")!.status).toBe(
      "passed",
    );
    expect(verified.tasks.find((t) => t.id === "production.dodo")!.status).toBe(
      "not_checked",
    );
    expect(
      verified.tasks.find((t) => t.id === "curated:local.account.dodo")!.status,
    ).toBe("not_checked");
  });
  it("preserves a completed legacy anchor without marking new curated work complete", () => {
    const anchor = buildLaunchpadTasks(project, "vercel").find(
      (t) => t.id === "local.install",
    )!;
    const state = {
      ...defaultLaunchpadState(),
      manual: { [anchor.id]: anchor.signature },
    };
    const tasks = buildLaunchpad(project, state).tasks;
    expect(tasks.find((t) => t.id === anchor.id)!.status).toBe("manual");
    expect(
      tasks
        .filter((t) => t.anchorId === anchor.id && t.id !== anchor.id)
        .every((t) => t.status === "not_checked"),
    ).toBe(true);
  });
});
