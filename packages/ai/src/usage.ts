import type { CreditCalculation, TokenUsage } from "./types";

function readNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.ceil(value));
    }
  }

  return 0;
}

export function extractTokenUsage(usage: unknown): TokenUsage {
  if (!usage || typeof usage !== "object") {
    return {
      requestTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
    };
  }

  const source = usage as Record<string, unknown>;
  const requestTokens = readNumber(source, [
    "inputTokens",
    "promptTokens",
    "prompt_tokens",
  ]);
  const responseTokens = readNumber(source, [
    "outputTokens",
    "completionTokens",
    "completion_tokens",
  ]);
  const explicitTotal = readNumber(source, ["totalTokens", "total_tokens"]);
  const totalTokens = explicitTotal || requestTokens + responseTokens;

  return {
    requestTokens,
    responseTokens,
    totalTokens,
  };
}

export function calculateCreditsFromTokens(totalTokens: number | null | undefined) {
  const safeTotal = Math.max(0, Math.ceil(totalTokens ?? 0));
  return Math.max(1, Math.ceil(safeTotal / 1000));
}

export function calculateAIUsageCredits(usage: unknown): CreditCalculation {
  const tokens = extractTokenUsage(usage);

  return {
    ...tokens,
    creditsCharged: calculateCreditsFromTokens(tokens.totalTokens),
  };
}
