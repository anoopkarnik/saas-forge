import { auth } from "@workspace/auth/better-auth/auth";
import {
  OPENAI_TTS_URL,
  applySpeechTemplate,
} from "@/lib/aiSpeech";
import {
  getPersistedSpeechConfig,
  jsonSpeechError,
  readProviderResponse,
} from "@/lib/aiSpeechServer";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const ttsRequestSchema = z.object({
  text: z.string().min(1),
  voice: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  responseFormat: z.string().min(1).optional(),
});

function isBsamaritanTtsUrl(url: string) {
  if (url === "{your tts endpoint}") {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === "{your tts endpoint}" ||
      parsedUrl.pathname.replace(/\/$/, "").endsWith("/tts")
    );
  } catch {
    return false;
  }
}

function buildBsamaritanTtsBody(text: string, sampleBody: Record<string, unknown>) {
  return {
    text,
    speaker:
      typeof sampleBody.speaker === "string" && sampleBody.speaker.trim()
        ? sampleBody.speaker
        : "p335",
    language:
      typeof sampleBody.language === "string" && sampleBody.language.trim()
        ? sampleBody.language
        : "en",
  };
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return jsonSpeechError("You must be logged in to use text to speech.", 401);
  }

  const parsed = ttsRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonSpeechError("Invalid text to speech request.", 400);
  }

  const config = await getPersistedSpeechConfig("tts");
  if (!config.enabled || !config.url) {
    return jsonSpeechError("Text to speech is not configured.", 412);
  }

  const body = applySpeechTemplate(config.sampleBody, {
    text: parsed.data.text,
    voice: parsed.data.voice ?? "coral",
    model: parsed.data.model ?? "gpt-4o-mini-tts",
    responseFormat: parsed.data.responseFormat ?? "mp3",
  }) as Record<string, unknown>;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (config.provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return jsonSpeechError("OpenAI API key is not configured.", 412);
    }

    headers.Authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
    body.input = parsed.data.text;
    body.model = parsed.data.model ?? body.model ?? "gpt-4o-mini-tts";
    body.voice = parsed.data.voice ?? body.voice ?? "coral";
    body.response_format =
      parsed.data.responseFormat ?? body.response_format ?? body.responseFormat ?? "mp3";
  } else if (isBsamaritanTtsUrl(config.url)) {
    const bsamaritanBody = buildBsamaritanTtsBody(parsed.data.text, config.sampleBody);
    body.text = bsamaritanBody.text;
    body.speaker = bsamaritanBody.speaker;
    body.language = bsamaritanBody.language;
    delete body.voice;
    delete body.model;
    delete body.responseFormat;
    delete body.response_format;
  }

  const response = await fetch(config.provider === "openai" ? config.url || OPENAI_TTS_URL : config.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    return jsonSpeechError(
      "Text to speech provider request failed.",
      response.status >= 500 ? 502 : response.status || 502,
      await readProviderResponse(response),
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", response.headers.get("content-type") ?? "application/octet-stream");

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}
