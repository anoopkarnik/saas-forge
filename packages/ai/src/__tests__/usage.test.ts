import { describe, expect, it } from "vitest";
import {
  calculateAIUsageCredits,
  calculateCreditsFromTokens,
  extractTokenUsage,
  getAIConfigStatus,
} from "../index.js";

describe("@workspace/ai usage helpers", () => {
  it("rounds token usage up to credits with a one-credit minimum", () => {
    expect(calculateCreditsFromTokens(0)).toBe(1);
    expect(calculateCreditsFromTokens(1)).toBe(1);
    expect(calculateCreditsFromTokens(1000)).toBe(1);
    expect(calculateCreditsFromTokens(1001)).toBe(2);
  });

  it("extracts AI SDK and OpenAI-compatible token usage shapes", () => {
    expect(
      extractTokenUsage({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      }),
    ).toEqual({ requestTokens: 10, responseTokens: 20, totalTokens: 30 });

    expect(
      calculateAIUsageCredits({
        prompt_tokens: 900,
        completion_tokens: 201,
      }),
    ).toEqual({
      requestTokens: 900,
      responseTokens: 201,
      totalTokens: 1101,
      creditsCharged: 2,
    });
  });

  it("reports disabled and unconfigured states without provider secrets", () => {
    expect(getAIConfigStatus({ NEXT_PUBLIC_AI_ENABLED: "false" })).toMatchObject({
      enabled: false,
      configured: false,
      provider: null,
      providers: [],
    });

    expect(
      getAIConfigStatus({
        NEXT_PUBLIC_AI_ENABLED: "true",
      }),
    ).toMatchObject({
      enabled: true,
      configured: false,
      provider: null,
      providers: [],
      model: null,
    });
  });

  it("reports all configured providers from environment credentials", () => {
    const status = getAIConfigStatus({
      NEXT_PUBLIC_AI_ENABLED: "true",
      AI_GATEWAY_API_KEY: "gateway",
      OPENAI_API_KEY: "openai",
      ANTHROPIC_API_KEY: "anthropic",
      OPENAI_COMPATIBLE_BASE_URL: "https://example.com/v1",
    });

    expect(status.provider).toBe("gateway");
    expect(status.providers).toEqual([
      "gateway",
      "openai",
      "anthropic",
      "openai-compatible",
    ]);
    expect(status.model).toBeNull();
  });
});
