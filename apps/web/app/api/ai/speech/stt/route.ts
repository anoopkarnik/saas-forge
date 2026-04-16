import { Buffer } from "node:buffer";
import { auth } from "@workspace/auth/better-auth/auth";
import {
  OPENAI_STT_URL,
  applySpeechTemplate,
  hasSpeechFilePlaceholder,
} from "@/lib/aiSpeech";
import {
  extractSpeechText,
  getPersistedSpeechConfig,
  jsonSpeechError,
  readProviderResponse,
} from "@/lib/aiSpeechServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

function stringFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function isDirectFilePlaceholder(value: unknown) {
  return typeof value === "string" && /\{\{(file|audio)\}\}/.test(value);
}

function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  formData.append(key, typeof value === "string" ? value : JSON.stringify(value));
}

function shouldSendCustomMultipart(url: string, sampleBody: Record<string, unknown>) {
  if (hasSpeechFilePlaceholder(sampleBody)) {
    return true;
  }

  if (url === "{your stt endpoint}") {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === "{your stt endpoint}" ||
      parsedUrl.pathname.replace(/\/$/, "").endsWith("/transcribe")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return jsonSpeechError("You must be logged in to use speech to text.", 401);
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return jsonSpeechError("Invalid speech to text request.", 400);
  }

  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonSpeechError("Audio file is required.", 400);
  }

  const language = stringFormValue(formData.get("language"));
  const prompt = stringFormValue(formData.get("prompt"));
  const requestedModel = stringFormValue(formData.get("model"));
  const model = requestedModel || "gpt-4o-mini-transcribe";

  const config = await getPersistedSpeechConfig("stt");
  if (!config.enabled || !config.url) {
    return jsonSpeechError("Speech to text is not configured.", 412);
  }

  if (config.provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return jsonSpeechError("OpenAI API key is not configured.", 412);
    }

    const body = applySpeechTemplate(config.sampleBody, {
      file: file.name || "audio.webm",
      filename: file.name || "audio.webm",
      mimeType: file.type || "application/octet-stream",
      language,
      prompt,
      model,
    }) as Record<string, unknown>;

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name || "audio.webm");

    const normalizedBody = {
      ...body,
      model: requestedModel || body.model || "gpt-4o-mini-transcribe",
    };

    for (const [key, value] of Object.entries(normalizedBody)) {
      if (key === "file" || value === undefined || value === null || value === "") {
        continue;
      }

      upstreamFormData.append(key, typeof value === "string" ? value : JSON.stringify(value));
    }

    const response = await fetch(config.url || OPENAI_STT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: upstreamFormData,
      cache: "no-store",
    });

    const raw = await readProviderResponse(response);
    if (!response.ok) {
      return jsonSpeechError("Speech to text provider request failed.", response.status || 502, raw);
    }

    return Response.json({ text: extractSpeechText(raw), raw });
  }

  if (shouldSendCustomMultipart(config.url, config.sampleBody)) {
    const upstreamFormData = new FormData();
    let appendedFile = false;
    const placeholders = {
      audioBase64: "",
      file: file.name || "audio.webm",
      audio: file.name || "audio.webm",
      filename: file.name || "audio.webm",
      mimeType: file.type || "application/octet-stream",
      language,
      prompt,
      model,
    };

    for (const [key, value] of Object.entries(config.sampleBody)) {
      if (isDirectFilePlaceholder(value)) {
        upstreamFormData.append(key, file, file.name || "audio.webm");
        appendedFile = true;
        continue;
      }

      appendFormValue(upstreamFormData, key, applySpeechTemplate(value, placeholders));
    }

    if (!appendedFile) {
      upstreamFormData.append("audio", file, file.name || "audio.webm");
    }

    const response = await fetch(config.url, {
      method: "POST",
      body: upstreamFormData,
      cache: "no-store",
    });

    const raw = await readProviderResponse(response);
    if (!response.ok) {
      return jsonSpeechError("Speech to text provider request failed.", response.status || 502, raw);
    }

    return Response.json({ text: extractSpeechText(raw), raw });
  }

  const audioBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const body = applySpeechTemplate(config.sampleBody, {
    audioBase64,
    filename: file.name || "audio.webm",
    mimeType: file.type || "application/octet-stream",
    language,
    prompt,
    model,
  });

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await readProviderResponse(response);
  if (!response.ok) {
    return jsonSpeechError("Speech to text provider request failed.", response.status || 502, raw);
  }

  return Response.json({ text: extractSpeechText(raw), raw });
}
