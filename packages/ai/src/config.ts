import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOllama } from "ai-sdk-ollama";
import type { AIConfigStatus, AIProviderKind, ResolvedAIModel } from "./types";

const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function isEnabled(value: string | undefined) {
  return value === "true";
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function stripProviderPrefix(model: string, provider: AIProviderKind) {
  const prefix = `${provider}/`;
  if (model.startsWith(prefix)) {
    return model.slice(prefix.length);
  }

  // Legacy/Compatibility check for openai-compatible
  if (provider === "openai-compatible" && model.startsWith("openai/")) {
    return model.slice("openai/".length);
  }

  return model;
}

export function getConfiguredAIProviders(
  env: Record<string, string | undefined> = process.env,
): AIProviderKind[] {
  const providers: AIProviderKind[] = [];

  if (clean(env.AI_GATEWAY_API_KEY)) providers.push("gateway");
  if (clean(env.OPENAI_API_KEY)) providers.push("openai");
  if (clean(env.ANTHROPIC_API_KEY)) providers.push("anthropic");
  if (clean(env.GOOGLE_GENERATIVE_AI_API_KEY)) providers.push("google");
  if (clean(env.OPENROUTER_API_KEY)) providers.push("openrouter");
  if (clean(env.OLLAMA_BASE_URL) || clean(env.NEXT_PUBLIC_OLLAMA_BASE_URL)) providers.push("ollama");
  if (clean(env.OPENAI_COMPATIBLE_BASE_URL)) providers.push("openai-compatible");

  return providers;
}

export function getAIConfigStatus(
  env: Record<string, string | undefined> = process.env,
): AIConfigStatus {
  const providers = getConfiguredAIProviders(env);

  if (!isEnabled(env.NEXT_PUBLIC_AI_ENABLED)) {
    return {
      enabled: false,
      configured: false,
      reason: "AI is disabled. Set NEXT_PUBLIC_AI_ENABLED=true to enable it.",
      provider: null,
      providers,
      model: null,
    };
  }

  if (!providers.length) {
    return {
      enabled: true,
      configured: false,
      reason:
        "No AI provider credentials are configured. Set AI_GATEWAY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL, or OPENAI_COMPATIBLE_BASE_URL.",
      provider: null,
      providers,
      model: null,
    };
  }

  return {
    enabled: true,
    configured: true,
    reason: null,
    provider: providers[0] ?? null,
    providers,
    model: null,
  };
}

export function resolveAIModel(
  env: Record<string, string | undefined> = process.env,
  overrides?: { provider?: AIProviderKind; model?: string },
): ResolvedAIModel {
  const status = getAIConfigStatus(env);

  const provider = overrides?.provider;
  const model = overrides?.model;

  if (!status.enabled) {
    throw new Error(status.reason ?? "AI is disabled.");
  }

  if (!status.configured) {
    throw new Error(status.reason ?? "AI provider credentials are not configured.");
  }

  if (!provider) {
    throw new Error("AI prompt provider is not configured.");
  }

  if (!status.providers.includes(provider)) {
    throw new Error(`AI provider is not configured: ${provider}`);
  }

  if (!model) {
    throw new Error("AI prompt model is not configured.");
  }

  const modelId = stripProviderPrefix(model, provider);

  switch (provider) {
    case "openai":
      return {
        provider,
        modelId,
        model: openai(modelId),
      };

    case "anthropic":
      return {
        provider,
        modelId,
        model: anthropic(modelId),
      };

    case "google":
      return {
        provider,
        modelId,
        model: google(modelId),
      };

    case "openrouter": {
      const openRouter = createOpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: OPENROUTER_BASE_URL,
      });
      return {
        provider,
        modelId,
        model: openRouter(modelId),
      };
    }

    case "ollama": {
      const ollama = createOllama({
        baseURL:
          clean(env.OLLAMA_BASE_URL) ??
          clean(env.NEXT_PUBLIC_OLLAMA_BASE_URL) ??
          "http://localhost:11434/api",
      });
      return {
        provider,
        modelId,
        model: ollama(modelId),
      };
    }

    case "gateway": {
      const gateway = createOpenAICompatible({
        name: "ai-gateway",
        apiKey: env.AI_GATEWAY_API_KEY,
        baseURL: AI_GATEWAY_BASE_URL,
      });

      return {
        provider,
        modelId,
        model: gateway(modelId),
      };
    }

    case "openai-compatible": {
      const compat = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: env.OPENAI_COMPATIBLE_BASE_URL ?? "",
        apiKey: env.OPENAI_COMPATIBLE_API_KEY ?? env.OPENAI_API_KEY,
      });

      return {
        provider,
        modelId,
        model: compat(modelId),
      };
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Lists available models for a given provider.
 * This is used in the admin panel for model selection.
 */
export async function listModels(
  provider: AIProviderKind,
  env: Record<string, string | undefined> = process.env,
): Promise<string[]> {
  switch (provider) {
    case "openai": {
      try {
        const apiKey = clean(env.OPENAI_API_KEY);
        if (!apiKey) {
          // Fallback to basic list if no API key is present
          return [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "o1-preview",
            "o1-mini",
            "gpt-5", // Future-proof if API key is missing
          ];
        }

        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) return [];
        const data = await response.json();
        
        // Filter for chat models and common prefixes, sort by ID descending (roughly newest first)
        return data.data
          .filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1-"))
          .map((m: any) => m.id)
          .sort()
          .reverse();
      } catch (e) {
        console.error("Failed to fetch OpenAI models:", e);
        return [];
      }
    }

    case "anthropic":
      return [
        "claude-3-5-sonnet-latest",
        "claude-3-5-sonnet-20240620",
        "claude-3-opus-latest",
        "claude-3-opus-20240229",
        "claude-3-sonnet-latest",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-latest",
        "claude-3-haiku-20240307",
      ];

    case "google": {
      try {
        const apiKey = clean(env.GOOGLE_GENERATIVE_AI_API_KEY);
        if (!apiKey) {
          return [
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro",
            "gemini-2.0-flash-exp",
          ];
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        return (
          data.models
            ?.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name.replace("models/", "")) ?? []
        );
      } catch (e) {
        console.error("Failed to fetch Google models:", e);
        return [];
      }
    }

    case "ollama": {
      try {
        const baseUrl =
          clean(env.OLLAMA_BASE_URL) ??
          clean(env.NEXT_PUBLIC_OLLAMA_BASE_URL) ??
          "http://localhost:11434/api";

        // Strip /api if present for the tags endpoint
        const base = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
        const response = await fetch(`${base}/api/tags`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.models?.map((m: any) => m.name) ?? [];
      } catch (e) {
        console.error("Failed to fetch Ollama models:", e);
        return [];
      }
    }

    case "openrouter": {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        if (!response.ok) return [];
        const data = await response.json();
        return data.data?.map((m: any) => m.id) ?? [];
      } catch (e) {
        console.error("Failed to fetch OpenRouter models:", e);
        return [];
      }
    }

    default:
      return [];
  }
}
