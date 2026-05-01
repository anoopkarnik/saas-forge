export const AI_N8N_WEBHOOK_PROVIDER = "n8n-webhook";
export const AI_LEGACY_WEBHOOK_PROVIDER = "webhook";
export const AI_WEBHOOK_PROVIDER = AI_N8N_WEBHOOK_PROVIDER;
export const AI_WEBHOOK_MODEL = AI_N8N_WEBHOOK_PROVIDER;

export const DEFAULT_N8N_WEBHOOK_TEMPLATE = `{
  "promptKey": {{promptKey}},
  "input": {{input}},
  "system": {{system}},
  "messages": {{messages}},
  "context": {{context}}
}`;

export type N8nWebhookEnvConfig = {
  configured: boolean;
  baseUrl: string;
  jwtKey: string | null;
  hasBaseUrl: boolean;
  hasJwtKey: boolean;
};

export type PublicN8nWebhookConfig = Omit<N8nWebhookEnvConfig, "jwtKey">;

export type AiWebhookMessage = {
  role: string;
  content: string;
};

export type AiWebhookContext = Record<string, unknown> & {
  flow: "chat" | "documentation" | "cms";
};

export type AiWebhookRequest = {
  promptKey: string;
  system?: string | null;
  messages?: AiWebhookMessage[];
  input: string;
  context: AiWebhookContext;
};
