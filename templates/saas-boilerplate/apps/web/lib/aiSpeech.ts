export type SpeechCapability = "tts" | "stt";
export type SpeechProvider = "custom" | "openai";

export type SpeechConfig = {
  capability: SpeechCapability;
  provider: SpeechProvider;
  enabled: boolean;
  url: string;
  sampleBody: Record<string, unknown>;
};

export const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
export const OPENAI_STT_URL = "https://api.openai.com/v1/audio/transcriptions";

export const OPENAI_TTS_SAMPLE_BODY = {
  model: "gpt-4o-mini-tts",
  voice: "coral",
  input: "{{text}}",
  response_format: "mp3",
};

export const OPENAI_STT_SAMPLE_BODY = {
  model: "gpt-4o-mini-transcribe",
  file: "{{file}}",
  response_format: "json",
};

export const CUSTOM_TTS_SAMPLE_BODY = {
  text: "{{text}}",
  speaker: "p335",
  language: "en",
};

export const CUSTOM_STT_SAMPLE_BODY = {
  audio: "{{file}}",
};

const DEFAULT_CUSTOM_URLS: Record<SpeechCapability, string> = {
  tts: "{your tts endpoint}",
  stt: "{your stt endpoint}",
};

export function getSpeechProviderPreset(
  capability: SpeechCapability,
  provider: SpeechProvider,
): Pick<SpeechConfig, "provider" | "url" | "sampleBody"> {
  if (provider === "openai") {
    return {
      provider,
      url: capability === "tts" ? OPENAI_TTS_URL : OPENAI_STT_URL,
      sampleBody: capability === "tts" ? OPENAI_TTS_SAMPLE_BODY : OPENAI_STT_SAMPLE_BODY,
    };
  }

  return {
    provider,
    url: DEFAULT_CUSTOM_URLS[capability],
    sampleBody: capability === "tts" ? CUSTOM_TTS_SAMPLE_BODY : CUSTOM_STT_SAMPLE_BODY,
  };
}

export function getDefaultSpeechConfig(capability: SpeechCapability): SpeechConfig {
  return {
    capability,
    enabled: false,
    ...getSpeechProviderPreset(capability, "custom"),
  };
}

export function normalizeSpeechUrl(value: string) {
  const trimmed = value.trim();
  const protocolMatch = trimmed.match(/^([a-z][a-z\d+\-.]*):\/\//i);
  const placeholderMatch = trimmed.match(/^\{your [^}]+\}/i);

  if (protocolMatch && protocolMatch[1]?.toLowerCase() !== "http" && protocolMatch[1]?.toLowerCase() !== "https") {
    throw new Error("Speech endpoint URL must use http or https.");
  }

  if (placeholderMatch) {
    return placeholderMatch[0];
  }

  if (!trimmed || /[\s{}]/.test(trimmed)) {
    throw new Error("Invalid URL");
  }

  if (!protocolMatch) {
    return `https://${trimmed}`;
  }

  const url = new URL(trimmed);

  return url.toString();
}

export function parseSpeechSampleBody(value: string) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Sample body must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

export function stringifySpeechSampleBody(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function applySpeechTemplate(value: unknown, placeholders: Record<string, string>): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => placeholders[key] ?? "");
  }

  if (Array.isArray(value)) {
    return value.map((item) => applySpeechTemplate(item, placeholders));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, applySpeechTemplate(item, placeholders)]),
    );
  }

  return value;
}

export function hasSpeechFilePlaceholder(value: unknown): boolean {
  if (typeof value === "string") {
    return /\{\{(file|audio)\}\}/.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasSpeechFilePlaceholder(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasSpeechFilePlaceholder(item));
  }

  return false;
}

export function mergeSpeechConfig(record: unknown, capability: SpeechCapability): SpeechConfig {
  const fallback = getDefaultSpeechConfig(capability);
  if (!record || typeof record !== "object") {
    return fallback;
  }

  const data = record as Partial<SpeechConfig>;
  return {
    capability,
    provider: data.provider === "openai" ? "openai" : "custom",
    enabled: Boolean(data.enabled),
    url: typeof data.url === "string" && data.url.trim() ? data.url : fallback.url,
    sampleBody:
      data.sampleBody && typeof data.sampleBody === "object" && !Array.isArray(data.sampleBody)
        ? (data.sampleBody as Record<string, unknown>)
        : fallback.sampleBody,
  };
}
