import {
  AI_LEGACY_WEBHOOK_PROVIDER,
  AI_N8N_WEBHOOK_PROVIDER,
  type AiWebhookRequest,
  type N8nWebhookEnvConfig,
  type PublicN8nWebhookConfig,
} from "@/lib/ts-types/ai";

type TemplatePlaceholder = "promptKey" | "input" | "system" | "messages" | "context";

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isN8nWebhookProvider(provider: string | null | undefined) {
  return provider === AI_N8N_WEBHOOK_PROVIDER || provider === AI_LEGACY_WEBHOOK_PROVIDER;
}

export function normalizeN8nWebhookProvider(provider: string) {
  return isN8nWebhookProvider(provider) ? AI_N8N_WEBHOOK_PROVIDER : provider;
}

export function getN8nWebhookEnvConfig(
  env: Record<string, string | undefined> = process.env,
): N8nWebhookEnvConfig {
  const baseUrl = clean(env.N8N_WEBHOOK_URL) ?? "";
  const jwtKey = clean(env.N8N_WEBHOOK_JWT_KEY) ?? null;

  return {
    configured: Boolean(baseUrl && jwtKey),
    baseUrl,
    jwtKey,
    hasBaseUrl: Boolean(baseUrl),
    hasJwtKey: Boolean(jwtKey),
  };
}

export function toPublicN8nWebhookConfig(config: N8nWebhookEnvConfig): PublicN8nWebhookConfig {
  return {
    configured: config.configured,
    baseUrl: config.baseUrl,
    hasBaseUrl: config.hasBaseUrl,
    hasJwtKey: config.hasJwtKey,
  };
}

export function normalizeWebhookUrl(value: string) {
  const trimmed = value.trim();
  const protocolMatch = trimmed.match(/^([a-z][a-z\d+\-.]*):\/\//i);

  if (protocolMatch && protocolMatch[1]?.toLowerCase() !== "http" && protocolMatch[1]?.toLowerCase() !== "https") {
    throw new Error("n8n webhook URL must use http or https.");
  }

  if (!trimmed || /[\s{}]/.test(trimmed)) {
    throw new Error("Invalid n8n webhook URL.");
  }

  if (!protocolMatch) {
    return `https://${trimmed}`;
  }

  return new URL(trimmed).toString();
}

export function buildN8nWebhookUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeWebhookUrl(baseUrl);
  const trimmedPath = path.trim().replace(/^\/+/, "");

  if (!trimmedPath || /[\s{}]/.test(trimmedPath)) {
    throw new Error("n8n webhook path is required.");
  }

  return new URL(trimmedPath, normalizedBaseUrl.endsWith("/") ? normalizedBaseUrl : `${normalizedBaseUrl}/`).toString();
}

function readPath(source: AiWebhookRequest, key: TemplatePlaceholder) {
  return source[key];
}

export function renderN8nWebhookJsonTemplate(template: string, payload: AiWebhookRequest) {
  const trimmed = template.trim();

  if (!trimmed) {
    throw new Error("n8n webhook JSON format is required.");
  }

  const rendered = trimmed.replace(
    /"?\{\{(promptKey|input|system|messages|context)\}\}"?/g,
    (_match, key: TemplatePlaceholder) =>
      JSON.stringify(readPath(payload, key) ?? null),
  );

  try {
    return JSON.parse(rendered) as unknown;
  } catch {
    throw new Error("n8n webhook JSON format must render to valid JSON.");
  }
}

export function validateN8nWebhookJsonTemplate(template: string) {
  renderN8nWebhookJsonTemplate(template, {
    promptKey: "chat.assistant",
    input: "Example user input",
    system: null,
    messages: [{ role: "user", content: "Example user input" }],
    context: { flow: "chat" },
  });
}

export function extractWebhookText(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw.map(extractWebhookText).filter(Boolean).join("\n");
  }

  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const preferred = data.text ?? data.message ?? data.answer ?? data.output ?? data.response;

    if (typeof preferred === "string") {
      return preferred;
    }

    if (preferred !== undefined) {
      return extractWebhookText(preferred);
    }

    return JSON.stringify(data);
  }

  return "";
}
