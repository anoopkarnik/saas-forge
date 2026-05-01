export type AIProviderKind =
  | "openai"
  | "anthropic"
  | "google"
  | "ollama"
  | "openrouter"
  | "gateway"
  | "openai-compatible"
  | "n8n-webhook"
  | "webhook";

export type AIConfigStatus = {
  enabled: boolean;
  configured: boolean;
  reason: string | null;
  provider: AIProviderKind | null;
  providers: AIProviderKind[];
  model: string | null;
};

export type ResolvedAIModel = {
  provider: AIProviderKind;
  modelId: string;
  model: any;
};

export type TokenUsage = {
  requestTokens: number;
  responseTokens: number;
  totalTokens: number;
};

export type CreditCalculation = TokenUsage & {
  creditsCharged: number;
};

export type AIUsageLogPayload = {
  userId: string;
  promptKey: string;
  promptVersionId?: string | null;
  provider?: AIProviderKind | string | null;
  model?: string | null;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  creditsCharged?: number;
  latencyMs?: number;
  status: "started" | "success" | "failed";
  errorCode?: string | null;
  errorMessage?: string | null;
};
