import {
  buildN8nWebhookUrl,
  extractWebhookText,
  renderN8nWebhookJsonTemplate,
} from "@/lib/helper/aiWebhook";
import type { AiWebhookRequest, N8nWebhookEnvConfig } from "@/lib/ts-types/ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

async function readWebhookResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text().catch(() => "");

  if (!text) {
    return "";
  }

  if (contentType.includes("application/json") || /^(?:\{|\[)/.test(text.trim())) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

export async function callAIWebhook({
  config,
  path,
  template,
  payload,
}: {
  config: N8nWebhookEnvConfig;
  path: string;
  template: string;
  payload: AiWebhookRequest;
}) {
  if (!config.configured || !config.jwtKey) {
    throw new Error("n8n webhook provider is not configured.");
  }

  const response = await fetch(buildN8nWebhookUrl(config.baseUrl, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.jwtKey}`,
    },
    body: JSON.stringify(renderN8nWebhookJsonTemplate(template, payload)),
  });
  const raw = await readWebhookResponse(response);

  if (!response.ok) {
    const message = extractWebhookText(raw) || `n8n webhook provider failed with status ${response.status}.`;
    throw new Error(message);
  }

  const text = extractWebhookText(raw).trim();
  if (!text) {
    throw new Error("n8n webhook provider returned an empty response.");
  }

  return text;
}

export function createTextUIMessageStreamResponse(text: string, originalMessages?: UIMessage[]) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      const id = "n8n-webhook-text";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
