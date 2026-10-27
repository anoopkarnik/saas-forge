import { describe, expect, it } from "vitest";
import robots from "../robots";

describe("robots", () => {
  it("has a rule for GPTBot, ClaudeBot and PerplexityBot that allows /landing/blog and disallows /admin", () => {
    const rules = [robots().rules].flat();
    const aiRule = rules.find((rule) => [rule.userAgent].flat().includes("GPTBot"));

    expect(aiRule).toBeDefined();
    expect([aiRule!.userAgent].flat()).toEqual(expect.arrayContaining(["ClaudeBot", "PerplexityBot", "Google-Extended"]));
    expect(aiRule!.allow).toEqual(expect.arrayContaining(["/landing/blog", "/llms.txt"]));
    expect(aiRule!.disallow).toEqual(expect.arrayContaining(["/admin", "/api"]));
  });

  it("allows the blog and llms.txt for every crawler", () => {
    const rules = [robots().rules].flat();
    const everyone = rules.find((rule) => rule.userAgent === "*");
    expect(everyone!.allow).toEqual(expect.arrayContaining(["/landing/blog", "/llms.txt"]));
  });
});
