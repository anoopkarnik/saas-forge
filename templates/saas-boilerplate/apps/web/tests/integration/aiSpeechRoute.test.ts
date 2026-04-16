import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST as postTts } from "../../app/api/ai/speech/tts/route.js";
import { POST as postStt } from "../../app/api/ai/speech/stt/route.js";
import { auth } from "@workspace/auth/better-auth/auth";
import db from "@workspace/database/client";
import {
  OPENAI_STT_SAMPLE_BODY,
  OPENAI_STT_URL,
  OPENAI_TTS_SAMPLE_BODY,
  OPENAI_TTS_URL,
} from "@/lib/aiSpeech";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@workspace/database/client", () => ({
  default: {
    aiSpeechConfig: {
      findUnique: vi.fn(),
    },
  },
}));

function ttsRequest(body: unknown) {
  return new Request("http://localhost:3000/api/ai/speech/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sttRequest(formData: FormData) {
  return new Request("http://localhost:3000/api/ai/speech/stt", {
    method: "POST",
    body: formData,
  });
}

describe("AI speech routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
    } as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated TTS requests", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

    const response = await postTts(ttsRequest({ text: "Hello" }));

    expect(response.status).toBe(401);
  });

  it("returns 412 when TTS is disabled", async () => {
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "tts",
      provider: "custom",
      enabled: false,
      url: "{your tts endpoint}",
      sampleBody: { text: "{{text}}" },
    });

    const response = await postTts(ttsRequest({ text: "Hello" }));

    expect(response.status).toBe(412);
  });

  it("calls OpenAI for TTS with the configured API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "tts",
      provider: "openai",
      enabled: true,
      url: OPENAI_TTS_URL,
      sampleBody: OPENAI_TTS_SAMPLE_BODY,
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );

    const response = await postTts(ttsRequest({ text: "Hello" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(fetch).toHaveBeenCalledWith(
      OPENAI_TTS_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer sk-test" }),
      }),
    );
  });

  it("calls a custom TTS endpoint with placeholder substitution", async () => {
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "tts",
      provider: "custom",
      enabled: true,
      url: "{your tts endpoint}",
      sampleBody: { text: "{{text}}", speaker: "p335", language: "en" },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response("audio", {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }),
    );

    const response = await postTts(ttsRequest({ text: "Hello", responseFormat: "wav" }));
    const [, options] = vi.mocked(fetch).mock.calls[0]!;

    expect(response.status).toBe(200);
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      text: "Hello",
      speaker: "p335",
      language: "en",
    });
  });

  it("forces the bsamaritan TTS body when saved config is stale", async () => {
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "tts",
      provider: "custom",
      enabled: true,
      url: "{your tts endpoint}",
      sampleBody: {
        text: "{{text}}",
        voice: "{{voice}}",
        model: "{{model}}",
        responseFormat: "{{responseFormat}}",
      },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response("audio", {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }),
    );

    const response = await postTts(ttsRequest({ text: "Hello" }));
    const [, options] = vi.mocked(fetch).mock.calls[0]!;

    expect(response.status).toBe(200);
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      text: "Hello",
      speaker: "p335",
      language: "en",
    });
  });

  it("maps upstream TTS server failures to a gateway error", async () => {
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "tts",
      provider: "custom",
      enabled: true,
      url: "{your tts endpoint}",
      sampleBody: { text: "{{text}}", speaker: "p335", language: "en" },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "provider failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await postTts(ttsRequest({ text: "Hello" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Text to speech provider request failed.",
      details: { detail: "provider failed" },
    });
  });

  it("rejects STT requests without a file", async () => {
    const response = await postStt(sttRequest(new FormData()));

    expect(response.status).toBe(400);
  });

  it("sends OpenAI STT as multipart form data", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "stt",
      provider: "openai",
      enabled: true,
      url: OPENAI_STT_URL,
      sampleBody: OPENAI_STT_SAMPLE_BODY,
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const formData = new FormData();
    formData.append("file", new File(["audio"], "clip.wav", { type: "audio/wav" }));

    const response = await postStt(sttRequest(formData));
    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const body = (options as RequestInit).body as FormData;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      OPENAI_STT_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer sk-test" }),
      }),
    );
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("model")).toBe("gpt-4o-mini-transcribe");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("calls a custom STT endpoint with multipart audio", async () => {
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "stt",
      provider: "custom",
      enabled: true,
      url: "{your stt endpoint}",
      sampleBody: {
        audio: "{{file}}",
      },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ transcript: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const formData = new FormData();
    formData.append("file", new File(["audio"], "clip.wav", { type: "audio/wav" }));

    const response = await postStt(sttRequest(formData));
    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const rawBody = (options as RequestInit).body as FormData;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "{your stt endpoint}",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(await response.json()).toEqual({
      text: "Hello",
      raw: { transcript: "Hello" },
    });
    expect(rawBody).toBeInstanceOf(FormData);
    expect(rawBody.get("audio")).toBeInstanceOf(File);
  });

  it("forces multipart audio for the bsamaritan Whisper endpoint with stale JSON config", async () => {
    vi.mocked((db as any).aiSpeechConfig.findUnique).mockResolvedValue({
      capability: "stt",
      provider: "custom",
      enabled: true,
      url: "{your stt endpoint}",
      sampleBody: {
        audioBase64: "{{audioBase64}}",
        filename: "{{filename}}",
      },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const formData = new FormData();
    formData.append("file", new File(["audio"], "clip.wav", { type: "audio/wav" }));

    const response = await postStt(sttRequest(formData));
    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const rawBody = (options as RequestInit).body as FormData;

    expect(response.status).toBe(200);
    expect(rawBody).toBeInstanceOf(FormData);
    expect(rawBody.get("audio")).toBeInstanceOf(File);
  });
});
