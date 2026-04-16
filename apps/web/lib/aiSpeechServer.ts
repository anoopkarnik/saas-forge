import db from "@workspace/database/client";
import {
  mergeSpeechConfig,
  type SpeechCapability,
  type SpeechConfig,
} from "./aiSpeech";

export async function getPersistedSpeechConfig(
  capability: SpeechCapability,
): Promise<SpeechConfig> {
  const speechConfigDb = db as typeof db & {
    aiSpeechConfig: {
      findUnique(args: { where: { capability: SpeechCapability } }): Promise<unknown>;
    };
  };
  const record = await speechConfigDb.aiSpeechConfig.findUnique({
    where: { capability },
  });

  return mergeSpeechConfig(record, capability);
}

export function jsonSpeechError(message: string, status: number, details?: unknown) {
  return Response.json(details ? { error: message, details } : { error: message }, { status });
}

export async function readProviderResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => "");
}

export function extractSpeechText(raw: unknown) {
  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw)) {
    return extractSpeechText(raw[0]);
  }

  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const value = data.text ?? data.transcript ?? data.output ?? data.result;
    return typeof value === "string" ? value : "";
  }

  return "";
}
