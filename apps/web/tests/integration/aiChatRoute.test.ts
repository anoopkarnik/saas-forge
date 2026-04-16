import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../app/api/ai/chat/route.js";
import { auth } from "@workspace/auth/better-auth/auth";
import db from "@workspace/database/client";
import { getAIConfigStatus, resolveAIModel } from "@workspace/ai";
import { streamText } from "ai";

let finishPromise: Promise<void> | undefined;

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@workspace/observability/ai-logger", () => ({
  logAIEvent: vi.fn(),
}));

vi.mock("@workspace/ai", () => ({
  calculateAIUsageCredits: vi.fn(() => ({
    requestTokens: 500,
    responseTokens: 501,
    totalTokens: 1001,
    creditsCharged: 2,
  })),
  getAIConfigStatus: vi.fn(),
  getLastUserMessageText: vi.fn(() => "Hello"),
  getMessageText: vi.fn((message: any) =>
    Array.isArray(message.parts)
      ? message.parts.map((part: any) => part.text ?? "").join("")
      : (message.content ?? ""),
  ),
  resolveAIModel: vi.fn(),
  starterAssistantTools: {},
}));

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(async (messages) => messages),
  streamText: vi.fn(),
}));

vi.mock("@workspace/database/client", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    aiPrompt: {
      findUnique: vi.fn(),
    },
    aiConversation: {
      create: vi.fn(),
    },
    aiMessage: {
      createMany: vi.fn(),
    },
    aiUsageEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

function request(body: unknown) {
  return new Request("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AI chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    finishPromise = undefined;
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user_1", email: "test@example.com" },
    } as any);
    vi.mocked(getAIConfigStatus).mockReturnValue({
      enabled: true,
      configured: true,
      reason: null,
      provider: "gateway",
      providers: ["gateway"],
      model: null,
    });
    vi.mocked(resolveAIModel).mockReturnValue({
      provider: "gateway",
      modelId: "openai/gpt-5.4",
      model: "mock-model",
    });
    vi.mocked(db.user.findUnique).mockResolvedValue({
      creditsTotal: 10,
      creditsUsed: 0,
    } as any);
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({
      id: "prompt_1",
      key: "chat.assistant",
      activeVersion: {
        id: "version_1",
        content: "Be useful.",
        provider: "gateway",
        model: "openai/gpt-5.4",
      },
    });
    vi.mocked((db as any).aiConversation.create).mockResolvedValue({
      id: "conversation_1",
    });
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback({
        user: { update: vi.fn() },
        aiMessage: { create: vi.fn() },
        aiUsageEvent: { create: vi.fn() },
      }),
    );
    vi.mocked(streamText).mockImplementation((options: any) => {
      finishPromise = options.onFinish({
        usage: { inputTokens: 500, outputTokens: 501, totalTokens: 1001 },
        text: "Hello from AI",
        response: { messages: [] },
      });

      return {
        toUIMessageStreamResponse: () => new Response("stream", { status: 200 }),
      } as any;
    });
  });

  it("rejects unauthenticated users", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

    const response = await POST(request({ messages: [{ role: "user", parts: [] }] }));

    expect(response.status).toBe(401);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns a clean disabled response when AI is not configured", async () => {
    vi.mocked(getAIConfigStatus).mockReturnValue({
      enabled: true,
      configured: false,
      reason: "No AI provider credentials are configured.",
      provider: null,
      providers: [],
      model: null,
    });

    const response = await POST(request({ messages: [{ role: "user", parts: [] }] }));

    expect(response.status).toBe(412);
    expect(await response.json()).toEqual({
      error: "No AI provider credentials are configured.",
    });
  });

  it("checks credits before starting generation", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      creditsTotal: 1,
      creditsUsed: 1,
    } as any);

    const response = await POST(request({ messages: [{ role: "user", parts: [] }] }));

    expect(response.status).toBe(403);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("streams a response and records successful usage", async () => {
    const response = await POST(
      request({
        messages: [
          {
            id: "message_1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      }),
    );
    await finishPromise;

    expect(response.status).toBe(200);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: "Be useful.",
      }),
    );
    expect(db.$transaction).toHaveBeenCalled();
  });
});
