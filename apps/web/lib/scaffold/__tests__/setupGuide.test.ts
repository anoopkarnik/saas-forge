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
});
