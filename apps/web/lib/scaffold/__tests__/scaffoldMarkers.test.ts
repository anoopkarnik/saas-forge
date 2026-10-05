// @vitest-environment node
import { describe, expect, it } from "vitest";
import { InvalidScaffoldModuleError, stripScaffoldMarkers } from "@/lib/scaffold-modules";

const known = new Set(["billing", "ai"]);
const strip = (content: string, selected: string[]) =>
  stripScaffoldMarkers(content, new Set(selected), known, "file.ts");

const source = [
  "keep 1",
  "// scaffold:begin billing",
  "billing line",
  "{/* scaffold:begin ai */}",
  "billing + ai line",
  "{/* scaffold:end ai */}",
  "// scaffold:end billing",
  "# scaffold:begin ai",
  "ai line",
  "# scaffold:end ai",
  "keep 2",
].join("\n");

describe("stripScaffoldMarkers", () => {
  it("keeps region bodies but drops marker lines when modules are selected", () => {
    expect(strip(source, ["billing", "ai"])).toBe(
      ["keep 1", "billing line", "billing + ai line", "ai line", "keep 2"].join("\n"),
    );
  });

  it("drops unselected regions, including regions nested inside them", () => {
    expect(strip(source, ["ai"])).toBe(["keep 1", "ai line", "keep 2"].join("\n"));
    expect(strip(source, ["billing"])).toBe(["keep 1", "billing line", "keep 2"].join("\n"));
    expect(strip(source, [])).toBe(["keep 1", "keep 2"].join("\n"));
  });

  it("leaves files without markers untouched", () => {
    expect(strip("a\nb\n", [])).toBe("a\nb\n");
  });

  it.each([
    ["unknown module", "// scaffold:begin payments\nx\n// scaffold:end payments", /Unknown module "payments" .*file\.ts:1/],
    ["unclosed region", "// scaffold:begin ai\nx", /Unclosed scaffold:begin ai at file\.ts:1/],
    ["stray end", "x\n// scaffold:end ai", /Unmatched scaffold:end ai at file\.ts:2/],
    ["crossed regions", "// scaffold:begin ai\n// scaffold:begin billing\n// scaffold:end ai\n// scaffold:end billing", /Unmatched scaffold:end ai at file\.ts:3/],
  ])("rejects %s", (_label, content, message) => {
    expect(() => strip(content, ["ai", "billing"])).toThrow(InvalidScaffoldModuleError);
    expect(() => strip(content, ["ai", "billing"])).toThrow(message);
  });
});
