// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateSetupGuide } from "@/lib/scaffold/setup-guide";

const guide = (modules: Parameters<typeof generateSetupGuide>[0]["modules"]) =>
  generateSetupGuide({ name: "Demo", modules, config: {} }).markdown;

describe("generateSetupGuide", () => {
  it("explains the Python service only when ai_agents is selected", () => {
    expect(guide(["ai", "ai_agents"])).toContain("uv sync");
    expect(guide(["ai"])).not.toContain("uv sync");
    expect(guide([])).not.toContain("BACKEND_HMAC_SECRET");
  });

  it("starts with pnpm doctor", () => {
    const [title, , first] = guide([]).split("\n");
    expect(title).toBe("# Setup guide — Demo");
    expect(first).toMatch(/^Run `pnpm install`, then `pnpm doctor`/);
  });
});

describe("Launchpad download guide", () => {
  it("includes the selected platform journey and preserves the original guide response", () => {
    const result = generateSetupGuide({
      name: "Native Demo",
      modules: ["billing"],
      config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "dodo" },
      platforms: ["web", "mobile"],
      templateVersion: "2.0.0",
    });
    expect(result.accounts).toBeInstanceOf(Array);
    expect(result.secrets).toContain("DODO_PAYMENTS_API_KEY");
    expect(result.steps).toBeInstanceOf(Array);
    expect(result.markdown).toContain("## Project Launchpad");
    expect(result.markdown).toContain("eas-cli");
    expect(result.markdown).toContain("Check Dodo Payments");
    expect(result.markdown).not.toContain("Check Stripe");
    expect(result.markdown).not.toContain("## 3. Steps");
    expect(
      result.markdown.match(/#### Install project dependencies/g),
    ).toHaveLength(1);
  });
});

it("exports the same curated instructions for every stage without generation", async () => {
  const { defaultLaunchpadState, buildLaunchpad, completeTask } =
    await import("../launchpad/state");
  const { renderWalkthroughMarkdown } = await import("../launchpad/ai-state");
  const project = {
    name: "Demo",
    modules: [],
    platforms: ["web"],
    config: {},
    templateVersion: "2.0.0",
  };
  const initial = defaultLaunchpadState();
  const first = buildLaunchpad(project, initial).tasks[0]!;
  const state = completeTask(project, initial, first.id, true);
  const markdown = generateSetupGuide({
    ...project,
    launchpadState: state,
  }).markdown;
  expect(markdown).toContain(renderWalkthroughMarkdown(project, state));
  expect(markdown).toContain("#### Install project dependencies");
  expect(markdown).toContain("#### Describe the first useful customer outcome");
  expect(markdown).toContain("https://www.postgresql.org/docs/current/");
  expect(markdown).not.toContain("Agent Prompt");
});
