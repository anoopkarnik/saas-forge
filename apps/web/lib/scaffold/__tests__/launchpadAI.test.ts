// @vitest-environment node
import { describe, expect, it } from "vitest";
import { completeDraft } from "./launchpad-fixtures";
import { buildSourcePack } from "../launchpad/source-pack";
import { validateAgentResult, assertNoSecrets } from "../launchpad/ai-schema";
import {
  buildLaunchpad,
  completeTask,
  defaultLaunchpadState,
} from "../launchpad/state";
import type { GuidedTask, LaunchpadAIState } from "../launchpad/types";
import {
  acceptStageTasks,
  initialAIState,
  walkthroughTasks,
  operationSourcePack,
  renderWalkthroughMarkdown,
} from "../launchpad/ai-state";
import { importReport } from "../launchpad/state";
import { buildLaunchpadTasks } from "../launchpad/catalog";

const project = {
  name: "Demo",
  slug: "demo",
  modules: [],
  platforms: ["web"],
  templateVersion: "2.0.0",
  config: {
    DATABASE_URL: "postgresql://private:secret@db/db",
    NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
  },
};
const pack = () => buildSourcePack(project, "vercel", "local");
const draft = () => completeDraft(pack());

describe("AI Launchpad source boundary", () => {
  it("keeps incomplete legacy AI environment work open while preserving completed settings", () => {
    const current = pack();
    const legacy = {
      ...current,
      coverageRequirements: [],
      completedRequirements: [],
    };
    const value = completeDraft(legacy);
    value.tasks.find(
      (task) => task.anchorId === "local.environment",
    )!.instructions = ["Fill BETTER_AUTH_SECRET in apps/web/.env privately."];
    const state = acceptStageTasks(
      project,
      { ...defaultLaunchpadState(), ai: initialAIState() },
      "local",
      value,
      legacy,
      "legacy",
      [],
    );
    const secret = walkthroughTasks(project, state).find(
      (task) => task.anchorId === "local.environment",
    )!;
    const next = operationSourcePack(project, state, "local", [
      { id: secret.id, status: "manual" },
    ]);
    expect(next.completedAnchors).not.toContain("local.environment");
    expect(next.completedRequirements).toContain("env:BETTER_AUTH_SECRET");
    expect(next.completedRequirements).not.toContain("env:DATABASE_URL");
    const accepted = acceptStageTasks(
      project,
      state,
      "local",
      completeDraft(next),
      next,
      "current",
      [{ id: secret.id, status: "manual" }],
    );
    expect(
      walkthroughTasks(project, accepted).some((task) => task.id === secret.id),
    ).toBe(true);
  });
  it("filters provider coverage and rejects one oversized environment task", () => {
    const source = buildSourcePack(
      {
        ...project,
        modules: ["billing"],
        config: {
          NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo",
          NEXT_PUBLIC_EMAIL_CLIENT: "resend",
          NEXT_PUBLIC_IMAGE_STORAGE: "cloudflare_r2",
          NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
        },
      },
      "vercel",
      "local",
    );
    expect(
      source
        .coverageRequirements!.filter((item) => item.kind === "account")
        .map((item) => item.title),
    ).toEqual([
      "Postgres",
      "Dodo Payments",
      "Resend",
      "Upstash Redis",
      "Cloudflare R2",
    ]);
    expect(source.envKeys).toContain("DODO_PAYMENTS_API_KEY");
    expect(source.envKeys).not.toContain("STRIPE_SECRET_KEY");
    const value = completeDraft(source);
    expect(validateAgentResult(value, source).kind).toBe("generate");
    const settings = value.tasks.filter(
      (task) => task.anchorId === "local.environment",
    );
    settings[0]!.instructions.push(...settings[1]!.instructions);
    expect(() => validateAgentResult(value, source)).toThrow(
      /too many environment/,
    );
  });
  it("counts provider-specific setting instructions even outside the environment anchor", () => {
    const source = pack();
    const value = completeDraft(source);
    for (const task of value.tasks.filter(
      (item) => item.anchorId === "local.environment",
    ))
      task.anchorId = "local.accounts";
    const anchor = source.anchors.find(
      (item) => item.id === "local.environment",
    )!;
    value.tasks.push({
      ...value.tasks[0]!,
      key: "prepare-files",
      anchorId: anchor.id,
      title: "Prepare environment files",
      instructions: ["Prepare your environment files."],
      sourceIds: anchor.sourceIds,
      dependencies: [],
    });
    for (const task of value.tasks.filter(
      (item) => item.anchorId === "local.accounts",
    ))
      task.sourceIds = source.anchors.find(
        (item) => item.id === "local.accounts",
      )!.sourceIds;
    expect(validateAgentResult(value, source).kind).toBe("generate");
  });
  it("allows one conditional review of optional AI provider alternatives", () => {
    const source = buildSourcePack(
      {
        ...project,
        modules: ["ai"],
        config: { NEXT_PUBLIC_AI_ENABLED: "true" },
      },
      "vercel",
      "local",
    );
    const value = completeDraft(source);
    const optional = source.coverageRequirements!.filter(
      (item) => item.kind === "environment" && item.optional,
    );
    expect(optional.length).toBeGreaterThan(4);
    const target = value.tasks.find(
      (task) => task.anchorId === "local.environment",
    )!;
    target.instructions = [
      ...target.instructions,
      "Choose one AI provider. Configure its setting privately in apps/web/.env: " +
        optional.map((item) => item.title).join(", ") +
        ". Leave other provider settings blank.",
    ];
    expect(validateAgentResult(value, source).kind).toBe("generate");
  });
  it("requires every selected account and environment setting, not only broad anchors", () => {
    const source = buildSourcePack(
      {
        ...project,
        modules: ["billing"],
        config: {
          NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo",
          NEXT_PUBLIC_EMAIL_CLIENT: "resend",
          NEXT_PUBLIC_IMAGE_STORAGE: "cloudflare_r2",
          NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
        },
      },
      "vercel",
      "local",
    );
    const incomplete = source.anchors
      .filter((anchor) => !source.serverCheckAnchors?.includes(anchor.id))
      .map((anchor, index) => ({
        ...draft().tasks[0]!,
        key: `broad-${index}`,
        anchorId: anchor.id,
        sourceIds: anchor.sourceIds,
        instructions: ["Follow the supplied setup guidance."],
        dependencies: [],
      }));
    expect(() =>
      validateAgentResult({ kind: "generate", tasks: incomplete }, source),
    ).toThrow(/coverage|setting|account/);
  });
  it.each([
    "Run the 'Install project dependencies' command in the project root.",
    "Use the 'Run in apps/backend' command.",
    "Run local doctor",
    "Run the Python API.",
    "This key allows the app to run performance audits.",
    "Paste the copied database URL into DATABASE_URL in apps/web/.env.",
    "Paste it into the DATABASE_URL setting, keeping the existing equals sign.",
  ])(
    "accepts a grounded command reference or private field edit: %s",
    (prose) => {
      const source = pack();
      source.envKeys.push("GOOGLE_PAGESPEED_API_KEY");
      source.commands.push({
        id: "backend",
        label: "Run in apps/backend",
        command: "uv sync",
      });
      source.commands.push({
        id: "backend-start",
        label: "Start Python API",
        command: "pnpm --dir apps/backend dev",
      });
      const result = draft();
      result.tasks[0]!.instructions = [prose];
      expect(validateAgentResult(result, source).kind).toBe("generate");
      result.tasks[0]!.instructions = [prose + " Run unknown-tool --steal."];
      expect(() => validateAgentResult(result, source)).toThrow();
    },
  );
  it("builds bundled selected guidance without credentials or arbitrary config", () => {
    expect(JSON.stringify(pack())).not.toContain("private:secret");
    expect(pack().envKeys).toContain("DATABASE_URL");
    expect(
      pack().anchors.every((anchor) => anchor.id.startsWith("local.")),
    ).toBe(true);
    expect(pack().project.providers).toEqual({
      NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
    });
  });
  it("keeps detailed source excerpts bounded with every integration selected", () => {
    const source = buildSourcePack(
      {
        ...project,
        modules: ["billing", "ai", "ai_agents", "jobs", "webhooks"],
        platforms: ["web", "mobile", "desktop"],
        config: {
          NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo",
          NEXT_PUBLIC_IMAGE_STORAGE: "cloudflare_r2",
          NEXT_PUBLIC_EMAIL_CLIENT: "resend",
          NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
          NEXT_PUBLIC_AI_ENABLED: "true",
          NEXT_PUBLIC_AUTH_PROVIDERS: ["google", "github", "linkedin"],
          NEXT_PUBLIC_OBSERVABILITY_FEATURES: [
            "rate_limiting",
            "logging",
            "google_analytics",
            "ga4_reports",
            "pagespeed_insights",
          ],
        },
      },
      "vercel",
      "local",
    );
    expect(source.envKeys).toContain("WEBHOOK_SECRET_KEY");
    expect(source.sources.every((item) => item.excerpt.length <= 6000)).toBe(
      true,
    );
  });
  it("accepts grounded coverage and rejects omitted anchors, extra checks and unknown commands", () => {
    expect(validateAgentResult(draft(), pack()).kind).toBe("generate");
    const repeat = draft();
    repeat.tasks.push({
      ...repeat.tasks[0]!,
      key: "repeated-action",
      title: "Different title",
    });
    expect(() => validateAgentResult(repeat, pack())).toThrow(
      /repeated action/,
    );

    const secretKey = draft();
    secretKey.tasks[0]!.key = "nvapi-privateprovidercredential";
    expect(() => validateAgentResult(secretKey, pack())).toThrow(/credentials/);
    const anchored = draft();
    anchored.tasks.forEach(
      (task) => (task.sourceIds = [`source:${task.anchorId}`]),
    );
    expect(validateAgentResult(anchored, pack()).kind).toBe("generate");
    anchored.tasks[0]!.sourceIds = ["starter:workflow"];
    expect(() => validateAgentResult(anchored, pack())).toThrow(/unrelated/);
    expect(() =>
      validateAgentResult({ ...draft(), tasks: [] }, pack()),
    ).toThrow(/omitted/);
    const input = draft();
    input.tasks[0]!.commandIds = ["curl-secret"];
    expect(() => validateAgentResult(input, pack())).toThrow(
      /unsupported commands/,
    );
    expect(() =>
      validateAgentResult(
        {
          kind: "help",
          answer: "Okay",
          sourceIds: ["invented"],
          checkId: "postgres",
        },
        pack(),
      ),
    ).toThrow();
  });
  it("rejects fabricated paths and commands in prose, duplicate keys and forward dependencies", () => {
    const input = draft();
    input.tasks[0]!.instructions = ["Edit apps/web/imaginary.ts"];
    expect(() => validateAgentResult(input, pack())).toThrow(
      /unsupported file/,
    );
    input.tasks[0]!.instructions = ["Run curl https://evil.example"];
    expect(() => validateAgentResult(input, pack())).toThrow(/unsupported/);
    input.tasks[0]!.instructions = ["Follow the source."];
    input.tasks[0]!.dependencies = ["step-1"];
    expect(() => validateAgentResult(input, pack())).toThrow(/dependencies/);
  });
  it("rejects arbitrary shell instructions and absolute paths, while accepting exact source URLs", () => {
    for (const answer of [
      "Run dd if=/dev/zero of=/dev/sda",
      "Run reboot",
      "Run: reboot",
      "Run:unknown-tool argument",
      "Use the terminal command unknown-tool argument",
      "Run the generation command if unsure then run unknown-tool",
      "Run the invented command",
      "REVISE_FROM_SOURCE",
      "Run unknownprogram argument",
      "Run pnpm install to use reboot",
      "Run after setup run unknown-tool",
      "Run after setup use reboot",
      "Run pnpm install --invented",
      "Run pnpm install from the project root reboot",
      String.raw`Edit C:\workspace\private`,
      "Use npm install",
      "pnpm invented-command",
      "The pnpm tool changes /tmp/guide",
      "The pnpm tool works. Use npm install",
      "Execute: reboot",
      "Use the shell command reboot.",
      "Execute tee /tmp/guide",
      "Edit /tmp/guide",
      "Use `dangerous --flag`",
    ]) {
      expect(() =>
        validateAgentResult(
          { kind: "help", answer, sourceIds: [pack().sources[0]!.id] },
          pack(),
        ),
      ).toThrow();
    }
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer:
            "Run the generation command again if the value looks incorrect.",
          sourceIds: [pack().sources[0]!.id],
        },
        pack(),
      ).kind,
    ).toBe("help");
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Run after dependencies are installed.",
          sourceIds: [pack().sources[0]!.id],
        },
        pack(),
      ).kind,
    ).toBe("help");
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Run pnpm install from the project root.",
          sourceIds: [pack().sources[0]!.id],
        },
        pack(),
      ).kind,
    ).toBe("help");
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Run the install command from the project root.",
          sourceIds: [pack().sources[0]!.id],
        },
        pack(),
      ).kind,
    ).toBe("help");
    for (const answer of [
      "Run the copy command again if missing",
      "Run the secret generation command and set BETTER_AUTH_SECRET in apps/web/.env",
      "Run the generate command after dependencies are installed",
      "Run the migrate command to apply pending migrations",
      "Run the dev command for the web app",
      "Run configuration doctor interactively",
      "Run the doctor command in interactive mode",
      "Run the doctor with JSON output and save to launchpad-report.json",
      "Run local configuration check",
      "Run pnpm --dir apps/web dev to start the web app.",
      "Run pnpm doctor interactively to check for configuration issues.",
    ]) {
      expect(
        validateAgentResult(
          { kind: "help", answer, sourceIds: [pack().sources[0]!.id] },
          pack(),
        ).kind,
      ).toBe("help");
    }
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Run locally",
          sourceIds: [pack().sources[0]!.id],
        },
        pack(),
      ).kind,
    ).toBe("help");
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "The starter uses pnpm with Node.js.",
          sourceIds: [pack().sources[0]!.id],
        },
        pack(),
      ).kind,
    ).toBe("help");
    const labelPack = pack();
    labelPack.commands[0]!.label = "Run from the project root";
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Run from the project root.",
          sourceIds: [labelPack.sources[0]!.id],
        },
        labelPack,
      ).kind,
    ).toBe("help");
    const withBackend = buildSourcePack(
      { ...project, modules: ["ai_agents"] },
      "vercel",
      "local",
    );
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Configure /api/inngest",
          sourceIds: ["source:local.backend"],
        },
        withBackend,
      ).kind,
    ).toBe("help");
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: "Run the Python companion",
          sourceIds: ["source:local.backend"],
        },
        withBackend,
      ).kind,
    ).toBe("help");
    const url = "https://docs.astral.sh/uv/getting-started/installation/";
    expect(
      validateAgentResult(
        {
          kind: "help",
          answer: `See ${url}`,
          sourceIds: ["reference:local.backend:0"],
        },
        withBackend,
      ).kind,
    ).toBe("help");
    expect(() =>
      validateAgentResult(
        {
          kind: "help",
          answer: `See ${url}?invented=yes`,
          sourceIds: ["reference:local.backend:0"],
        },
        withBackend,
      ),
    ).toThrow(/website/);
  });
  it("rejects credentials in user answers and restricts questions to three known fields", () => {
    expect(() =>
      assertNoSecrets({ setup: "postgresql://user:password@db/app" }),
    ).toThrow(/credentials/);
    expect(() =>
      validateAgentResult(
        {
          kind: "interview",
          summary: "Useful app",
          questions: [
            {
              id: "password",
              question: "Your password?",
              suggestion: "secret",
            },
          ],
        },
        pack(),
      ),
    ).toThrow();
  });
});

describe("accepted small-task progress", () => {
  const guidedState = () => {
    const anchor = buildLaunchpadTasks(project, "vercel")[0]!;
    const task: GuidedTask = {
      ...anchor,
      id: "guided-1",
      title: "Create your database account",
      anchorId: anchor.id,
      anchorSignature: anchor.signature,
      sourceIds: [`source:${anchor.id}`],
      generated: true,
      signature: "guided-signature",
    };
    const state = defaultLaunchpadState();
    state.ai = {
      version: 2,
      brief: {
        revision: 1,
        confirmedRevision: 1,
        summary: "A useful product",
        answers: {
          audience: "Founders",
          journey: "Create a project",
          setup: "Downloaded",
          os: "Linux",
          launch: "Web MVP",
        },
        questions: [],
        followupRound: 0,
      },
      stages: {
        local: {
          fingerprint: "old",
          briefRevision: 1,
          sourceVersion: "launchpad-2",
          acceptedAt: new Date(0).toISOString(),
          tasks: [task],
        },
      },
      operations: [],
      helpHistory: [],
    } satisfies LaunchpadAIState;
    return state;
  };
  it("preserves completed accepted children while using the curated guide for unfinished work", () => {
    const state = guidedState();
    expect(
      buildLaunchpad(project, state).tasks.some(
        (task) => task.id === "guided-1",
      ),
    ).toBe(false);
    const complete = completeTask(project, state, "guided-1", true);
    expect(
      buildLaunchpad(project, complete).tasks.find(
        (task) => task.id === "guided-1",
      )?.status,
    ).toBe("manual");
  });
  it("removes generated tasks when the underlying applicable instructions change", () => {
    const state = guidedState();
    state.ai!.stages.local!.tasks[0]!.anchorSignature = "changed";
    expect(
      buildLaunchpad(project, state).tasks.some(
        (task) => task.id === "guided-1",
      ),
    ).toBe(false);
  });
});

describe("acceptance preserves evidence boundaries", () => {
  const ready = () => {
    const state = defaultLaunchpadState();
    state.ai = initialAIState();
    state.ai.brief = {
      revision: 1,
      confirmedRevision: 1,
      summary: "A useful tracker",
      answers: {
        audience: "Founders",
        journey: "Create a project",
        setup: "Downloaded",
        os: "Linux",
        launch: "Web MVP",
      },
      questions: [],
      followupRound: 0,
    };
    return state;
  };
  it("retains generated dependency order across anchors", () => {
    const input = draft();
    input.tasks.reverse();
    input.tasks.forEach(
      (task, index) =>
        (task.dependencies = index ? [input.tasks[index - 1]!.key] : []),
    );
    const state = acceptStageTasks(
      project,
      ready(),
      "local",
      input,
      pack(),
      "fingerprint",
      [],
    );
    expect(
      walkthroughTasks(project, state)
        .filter((task) => task.generated && !task.checkId)
        .map((task) => task.title),
    ).toEqual(input.tasks.map((task) => task.title));
  });
  it("only server-authored checks use imported evidence; preserves completed child IDs on regeneration", () => {
    const accepted = acceptStageTasks(
      project,
      ready(),
      "local",
      draft(),
      pack(),
      "fingerprint",
      [],
    );
    const checked = importReport(
      project,
      accepted,
      {
        modules: [],
        platforms: ["web"],
        checks: [{ id: "postgres", group: "services", status: "ok" }],
      },
      "local",
    );
    const journey = buildLaunchpad(project, checked);
    expect(
      journey.tasks
        .filter((task) => task.generated && !task.checkId)
        .every((task) => task.status === "not_checked"),
    ).toBe(true);
    expect(
      journey.tasks.find((task) => task.id === "local.postgres")?.status,
    ).toBe("passed");
    expect(
      journey.tasks.find((task) => task.id === "production.postgres")?.status,
    ).toBe("not_checked");
    const manual = journey.tasks.find(
      (task) => task.id.startsWith("curated:") && !task.checkId,
    )!;
    const completed = completeTask(project, checked, manual.id, true);
    const regenerated = acceptStageTasks(
      project,
      completed,
      "local",
      draft(),
      pack(),
      "fingerprint",
      buildLaunchpad(project, completed).tasks,
    );
    expect(
      buildLaunchpad(project, regenerated).tasks.find(
        (task) => task.id === manual.id,
      )?.status,
    ).toBe("manual");
    expect(
      walkthroughTasks(project, regenerated).filter(
        (task) => task.id === "local.postgres",
      ),
    ).toHaveLength(1);
  });
  it("keeps legacy completion as an anchor without completing new child tasks", () => {
    const legacy = ready();
    const anchor = buildLaunchpadTasks(project, "vercel")[0]!;
    const marked = completeTask(project, legacy, anchor.id, true);
    const state = acceptStageTasks(
      project,
      marked,
      "local",
      draft(),
      pack(),
      "fingerprint",
      buildLaunchpad(project, marked).tasks,
    );
    const tasks = buildLaunchpad(project, state).tasks;
    expect(tasks.find((task) => task.id === anchor.id)?.status).toBe("manual");
    expect(
      tasks
        .filter((task) => task.anchorId === anchor.id && task.id !== anchor.id)
        .every((task) => task.status === "not_checked"),
    ).toBe(true);
  });
});

it("preserves completed tasks when an unused legacy brief changes", () => {
  const state = defaultLaunchpadState();
  state.ai = initialAIState();
  const accepted = acceptStageTasks(
    project,
    state,
    "local",
    draft(),
    pack(),
    "fingerprint",
    [],
  );
  let complete = accepted;
  for (const task of walkthroughTasks(project, accepted).filter(
    (task) => task.stage === "local",
  ))
    complete = completeTask(project, complete, task.id, true);
  const before = buildLaunchpad(project, complete);
  complete.ai!.brief.revision++;
  complete.ai!.brief.answers.os = "Windows";
  complete.ai!.brief.summary = "Private legacy idea";
  const current = buildLaunchpad(project, complete);
  expect(current.tasks).toEqual(before.tasks);
  const markdown = renderWalkthroughMarkdown(project, complete);
  expect(markdown).not.toContain("Private legacy idea");
  expect(markdown).not.toContain("Project brief");
  expect(
    operationSourcePack(project, complete, "local", before.tasks)
      .completedAnchors,
  ).toHaveLength(pack().anchors.length);
});

it("accepts private file edits and exact command labels without allowing hidden shell instructions", () => {
  const source = pack();
  const label = source.commands[0]!.label;
  for (const answer of [
    `Run the '${label}' command shown below.`,
    "Paste it into your environment file later.",
    "Paste the value into apps/web/.env and save.",
    "Paste the same connection string, and save.",
    "Paste the value after the equals sign, and save.",
    "Paste your Upstash REST API URL after the equals sign and save.",
    "Paste your Upstash REST API token after the equals sign and save.",
    "Paste it into environment files later.",
    "Paste it into your environment file in the next task.",
    "Paste it into your environment file next.",
    "Paste the whole value without line breaks.",
  ]) {
    expect(
      validateAgentResult(
        { kind: "help", answer, sourceIds: [source.sources[0]!.id] },
        source,
      ).kind,
    ).toBe("help");
  }
  for (const answer of [
    `Run the '${label}' command shown below then run unknown-tool.`,
    "Paste it into your environment file then run unknown-tool.",
    "Paste unknown-tool argument into your terminal.",
    "Paste the value into your terminal and save.",
    "Paste the pnpm token after the equals sign and save.",
  ]) {
    expect(() =>
      validateAgentResult(
        { kind: "help", answer, sourceIds: [source.sources[0]!.id] },
        source,
      ),
    ).toThrow();
  }
});

it("accepts empty URI scheme names and grounded actions while rejecting connection strings and hidden commands", () => {
  const source = pack();
  const label = source.commands[0]!.label;
  for (const answer of [
    "Use the format starting with postgresql:// or postgres://.",
    `Run the '${label}' command from your project root folder.`,
    "Run the development server and verify the app loads.",
    "Run the interactive doctor first.",
    "Run the doctor export after any fix.",
    "Run the install dependencies task again if node_modules is missing.",
    "Run the install step again if node_modules is missing.",
    "Run the command and confirm it completes without error messages.",
    "Run this after any schema changes.",
    "Confirm the type is Redis (not Kafka).",
    "pnpm handles workspace packages and keeps dependency versions pinned.",
    `Run the '${label}' command to start the app.`,
  ])
    expect(
      validateAgentResult(
        { kind: "help", answer, sourceIds: [source.sources[0]!.id] },
        source,
      ).kind,
    ).toBe("help");
  for (const answer of [
    "Use postgres://user:secret@db/app.",
    "Run the development server and run unknown-tool.",
    `Run the '${label}' command from your project root folder then run unknown-tool.`,
  ])
    expect(() =>
      validateAgentResult(
        { kind: "help", answer, sourceIds: [source.sources[0]!.id] },
        source,
      ),
    ).toThrow();
});

it("rejects unsupported destructive file advice", () => {
  const source = pack();
  for (const answer of [
    "Delete pnpm-lock.yaml and retry.",
    "Remove apps/web/.env and start again.",
  ]) {
    expect(() =>
      validateAgentResult(
        { kind: "help", answer, sourceIds: [source.sources[0]!.id] },
        source,
      ),
    ).toThrow();
  }
});

it("bundles the real doctor statuses and rejects unrestricted database access advice", () => {
  const source = pack();
  expect(
    source.sources.find((item) => item.id === "starter:doctor-report")?.excerpt,
  ).toContain("ok, warn and fail");
  expect(() =>
    validateAgentResult(
      {
        kind: "help",
        answer: "Use 0.0.0.0/0 for development.",
        sourceIds: [source.sources[0]!.id],
      },
      source,
    ),
  ).toThrow();
});

it("keeps one server-defined check instead of asking AI to duplicate its work", () => {
  const source = pack();
  expect(source.serverCheckAnchors).toContain("local.postgres");
  const accepted = acceptStageTasks(
    project,
    defaultLaunchpadState(),
    "local",
    draft(),
    source,
    "fingerprint",
    [],
  );
  const tasks = walkthroughTasks(project, accepted);
  expect(tasks.filter((task) => task.id === "local.postgres")).toHaveLength(1);
  expect(
    tasks.filter((task) => task.anchorId === "local.postgres" && !task.checkId),
  ).toHaveLength(0);
});

it("allows warnings against deleting source files", () => {
  const source = pack();
  expect(
    validateAgentResult(
      {
        kind: "help",
        answer: "Do not delete pnpm-lock.yaml.",
        sourceIds: [source.sources[0]!.id],
      },
      source,
    ).kind,
  ).toBe("help");
});
