import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiRouter } from "../../trpc/routers/aiProcedures.js";
import db from "@workspace/database/client";
import { getAIConfigStatus, resolveAIModel } from "@workspace/ai";
import { generateText } from "ai";

const N8N_WEBHOOK_TEMPLATE = `{
  "promptKey": {{promptKey}},
  "input": {{input}},
  "system": {{system}},
  "messages": {{messages}},
  "context": {{context}}
}`;

vi.mock("@workspace/ai", () => ({
  getAIConfigStatus: vi.fn(),
  resolveAIModel: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@workspace/database/client", () => ({
  default: {
    $extends: vi.fn(() => ({})),
    aiPrompt: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aiPromptVersion: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    aiUsageEvent: {
      findMany: vi.fn(),
    },
    aiSpeechConfig: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

function createContext(role: "admin" | "user" = "admin") {
  return {
    headers: new Headers(),
    session: {
      user: {
        id: "user_1",
        email: "test@example.com",
        role,
      },
    },
  } as any;
}

describe("AI router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
    vi.mocked(generateText).mockResolvedValue({
      text: "{}",
    } as any);
  });

  it("returns sanitized AI status", async () => {
    const caller = aiRouter.createCaller(createContext());

    await expect(caller.getStatus()).resolves.toEqual({
      enabled: true,
      configured: true,
      reason: null,
      provider: "gateway",
      providers: ["gateway"],
      model: null,
    });
  });

  it("requires admin access for prompt management", async () => {
    const caller = aiRouter.createCaller(createContext("user"));

    await expect(caller.getPrompts()).rejects.toThrow("Admin access is required");
  });

  it("creates and activates a prompt version", async () => {
    const tx = {
      aiPrompt: {
        upsert: vi.fn().mockResolvedValue({ id: "prompt_1" }),
        update: vi.fn().mockResolvedValue({ id: "prompt_1" }),
      },
      aiPromptVersion: {
        findFirst: vi.fn().mockResolvedValue({ version: 2 }),
        create: vi.fn().mockResolvedValue({ id: "version_3", version: 3 }),
      },
    };
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.createPromptVersion({
      promptKey: "chat.assistant",
      name: "Assistant",
      content: "Be useful.",
      provider: "gateway",
      model: "openai/gpt-5.4",
      activate: true,
    });

    expect(result).toEqual({ id: "version_3", version: 3 });
    expect(tx.aiPromptVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        promptId: "prompt_1",
        version: 3,
        content: "Be useful.",
        provider: "gateway",
        model: "openai/gpt-5.4",
        createdByUserId: "user_1",
      }),
    });
    expect(tx.aiPrompt.update).toHaveBeenCalledWith({
      where: { id: "prompt_1" },
      data: { activeVersionId: "version_3" },
    });
  });

  it("adds n8n webhook to status when both env vars are set", async () => {
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/");
    vi.stubEnv("N8N_WEBHOOK_JWT_KEY", "secret");

    const caller = aiRouter.createCaller(createContext());

    await expect(caller.getStatus()).resolves.toEqual({
      enabled: true,
      configured: true,
      reason: null,
      provider: "gateway",
      providers: ["gateway", "n8n-webhook"],
      model: null,
    });
  });

  it("does not configure n8n webhook when one env var is missing", async () => {
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/");
    vi.mocked(getAIConfigStatus).mockReturnValue({
      enabled: true,
      configured: false,
      reason: "No AI provider credentials are configured.",
      provider: null,
      providers: [],
      model: null,
    });

    const caller = aiRouter.createCaller(createContext());

    await expect(caller.getStatus()).resolves.toEqual({
      enabled: true,
      configured: false,
      reason: "No AI provider credentials are configured.",
      provider: null,
      providers: [],
      model: null,
    });
  });

  it("creates an n8n webhook prompt version with path and JSON format", async () => {
    const tx = {
      aiPrompt: {
        upsert: vi.fn().mockResolvedValue({ id: "prompt_1" }),
        update: vi.fn().mockResolvedValue({ id: "prompt_1" }),
      },
      aiPromptVersion: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "version_1", version: 1 }),
      },
    };
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const caller = aiRouter.createCaller(createContext());
    await caller.createPromptVersion({
      promptKey: "chat.assistant",
      name: "Assistant",
      content: N8N_WEBHOOK_TEMPLATE,
      provider: "n8n-webhook",
      model: "webhook/get-summary",
      activate: true,
    });

    expect(tx.aiPromptVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: N8N_WEBHOOK_TEMPLATE,
        provider: "n8n-webhook",
        model: "webhook/get-summary",
      }),
    });
  });

  it("normalizes legacy webhook prompt saves to n8n-webhook", async () => {
    const tx = {
      aiPrompt: {
        upsert: vi.fn().mockResolvedValue({ id: "prompt_1" }),
        update: vi.fn().mockResolvedValue({ id: "prompt_1" }),
      },
      aiPromptVersion: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "version_1", version: 1 }),
      },
    };
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const caller = aiRouter.createCaller(createContext());
    await caller.createPromptVersion({
      promptKey: "chat.assistant",
      name: "Assistant",
      content: N8N_WEBHOOK_TEMPLATE,
      provider: "webhook",
      model: "webhook/get-summary",
      activate: true,
    });

    expect(tx.aiPromptVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "n8n-webhook",
      }),
    });
  });

  it("activates an existing prompt version", async () => {
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({ id: "prompt_1" });
    vi.mocked((db as any).aiPromptVersion.findFirst).mockResolvedValue({
      id: "version_1",
      promptId: "prompt_1",
    });
    vi.mocked((db as any).aiPrompt.update).mockResolvedValue({
      id: "prompt_1",
      activeVersionId: "version_1",
    });

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.activatePromptVersion({
      promptKey: "chat.assistant",
      versionId: "version_1",
    });

    expect(result).toEqual({ id: "prompt_1", activeVersionId: "version_1" });
  });

  it("updates an existing prompt version in place", async () => {
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({ id: "prompt_1" });
    vi.mocked((db as any).aiPromptVersion.findFirst).mockResolvedValue({
      id: "version_1",
      promptId: "prompt_1",
    });
    vi.mocked((db as any).aiPromptVersion.update).mockResolvedValue({
      id: "version_1",
      content: "Updated",
      provider: "gateway",
      model: "openai/gpt-5.4",
    });

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.updatePromptVersion({
      promptKey: "chat.assistant",
      versionId: "version_1",
      content: "Updated",
      provider: "gateway",
      model: "openai/gpt-5.4",
    });

    expect(result).toEqual({
      id: "version_1",
      content: "Updated",
      provider: "gateway",
      model: "openai/gpt-5.4",
    });
    expect((db as any).aiPromptVersion.update).toHaveBeenCalledWith({
      where: { id: "version_1" },
      data: {
        content: "Updated",
        provider: "gateway",
        model: "openai/gpt-5.4",
      },
    });
  });

  it("requires admin access for updating and deleting prompt versions", async () => {
    const caller = aiRouter.createCaller(createContext("user"));

    await expect(
      caller.updatePromptVersion({
        promptKey: "chat.assistant",
        versionId: "version_1",
        content: "Updated",
        provider: "gateway",
        model: "openai/gpt-5.4",
      }),
    ).rejects.toThrow("Admin access is required");

    await expect(
      caller.deletePromptVersion({
        promptKey: "chat.assistant",
        versionId: "version_1",
      }),
    ).rejects.toThrow("Admin access is required");
  });

  it("rejects updating a missing or mismatched prompt version", async () => {
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({ id: "prompt_1" });
    vi.mocked((db as any).aiPromptVersion.findFirst).mockResolvedValue(null);

    const caller = aiRouter.createCaller(createContext());

    await expect(
      caller.updatePromptVersion({
        promptKey: "chat.assistant",
        versionId: "other_prompt_version",
        content: "Updated",
        provider: "gateway",
        model: "openai/gpt-5.4",
      }),
    ).rejects.toThrow("Prompt version not found");
  });

  it("requires model and prompt content for non-webhook prompt versions", async () => {
    const caller = aiRouter.createCaller(createContext());

    await expect(
      caller.createPromptVersion({
        promptKey: "chat.assistant",
        name: "Assistant",
        provider: "gateway",
        activate: true,
      }),
    ).rejects.toThrow();
  });

  it("requires path and JSON format for n8n webhook prompt versions", async () => {
    const caller = aiRouter.createCaller(createContext());

    await expect(
      caller.createPromptVersion({
        promptKey: "chat.assistant",
        name: "Assistant",
        content: "",
        provider: "n8n-webhook",
        model: "",
        activate: true,
      }),
    ).rejects.toThrow("Path is required for n8n webhook provider.");

    await expect(
      caller.createPromptVersion({
        promptKey: "chat.assistant",
        name: "Assistant",
        content: "{",
        provider: "n8n-webhook",
        model: "webhook/get-summary",
        activate: true,
      }),
    ).rejects.toThrow("n8n webhook JSON format must render to valid JSON.");
  });

  it("deletes an inactive prompt version", async () => {
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({
      id: "prompt_1",
      activeVersionId: "version_2",
    });
    vi.mocked((db as any).aiPromptVersion.findFirst).mockResolvedValue({
      id: "version_1",
      promptId: "prompt_1",
    });
    vi.mocked((db as any).aiPromptVersion.delete).mockResolvedValue({
      id: "version_1",
    });

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.deletePromptVersion({
      promptKey: "chat.assistant",
      versionId: "version_1",
    });

    expect(result).toEqual({ id: "version_1" });
    expect((db as any).aiPromptVersion.delete).toHaveBeenCalledWith({
      where: { id: "version_1" },
    });
  });

  it("rejects deleting the active prompt version", async () => {
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({
      id: "prompt_1",
      activeVersionId: "version_1",
    });

    const caller = aiRouter.createCaller(createContext());

    await expect(
      caller.deletePromptVersion({
        promptKey: "chat.assistant",
        versionId: "version_1",
      }),
    ).rejects.toThrow("Activate another version before deleting this one.");
    expect((db as any).aiPromptVersion.delete).not.toHaveBeenCalled();
  });

  it("generates a documentation assistant draft", async () => {
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({
      id: "prompt_1",
      activeVersion: {
        id: "version_1",
        content: "Fill docs.",
        provider: "gateway",
        model: "openai/gpt-5.4",
      },
    });
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify({
        title: "Install",
        slug: "install",
        type: "Guide",
        order: 1,
        content: "# Install",
      }),
    } as any);

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.generateAdminDraft({
      kind: "documentation",
      current: { title: "Install" },
    });

    expect(result).toEqual({
      kind: "documentation",
      values: {
        title: "Install",
        slug: "install",
        type: "Guide",
        order: 1,
        content: "# Install",
      },
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: "Fill docs.",
      }),
    );
  });

  it("generates a CMS assistant draft through webhook provider", async () => {
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/");
    vi.stubEnv("N8N_WEBHOOK_JWT_KEY", "secret-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: JSON.stringify({
              heading: "Features",
              subheading: "Built fast",
              features: [],
            }),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );
    vi.mocked((db as any).aiPrompt.findUnique).mockResolvedValue({
      id: "prompt_1",
      activeVersion: {
        id: "version_1",
        content: N8N_WEBHOOK_TEMPLATE,
        provider: "n8n-webhook",
        model: "webhook/ai",
      },
    });

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.generateAdminDraft({
      kind: "cms",
      section: "features",
      current: { heading: "" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://n8n.example/webhook/ai",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" }),
      }),
    );
    expect(JSON.parse((fetch as any).mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        promptKey: "cms.assistant",
        input: expect.stringContaining("Fill the features CMS form"),
        messages: [],
        context: expect.objectContaining({ flow: "cms", section: "features" }),
      }),
    );
    expect(generateText).not.toHaveBeenCalled();
    expect(result.kind).toBe("cms");
  });

  it("returns default speech configs when none are saved", async () => {
    vi.mocked((db as any).aiSpeechConfig.findMany).mockResolvedValue([]);

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.getSpeechConfigs();

    expect(result).toEqual([
      expect.objectContaining({
        capability: "tts",
        provider: "custom",
        enabled: false,
        url: "{your tts endpoint}",
        sampleBody: { text: "{{text}}", speaker: "p335", language: "en" },
      }),
      expect.objectContaining({
        capability: "stt",
        provider: "custom",
        enabled: false,
        url: "{your stt endpoint}",
        sampleBody: { audio: "{{file}}" },
      }),
    ]);
  });

  it("saves a normalized speech config", async () => {
    vi.mocked((db as any).aiSpeechConfig.upsert).mockResolvedValue({
      capability: "tts",
      provider: "custom",
      enabled: true,
      url: "{your tts endpoint}",
      sampleBody: { text: "{{text}}", speaker: "p335", language: "en" },
    });

    const caller = aiRouter.createCaller(createContext());
    const result = await caller.saveSpeechConfig({
      capability: "tts",
      provider: "custom",
      enabled: true,
      url: "{your tts endpoint}/tts",
      sampleBody: JSON.stringify({ text: "{{text}}", speaker: "p335", language: "en" }),
    });

    expect((db as any).aiSpeechConfig.upsert).toHaveBeenCalledWith({
      where: { capability: "tts" },
      update: expect.objectContaining({
        url: "{your tts endpoint}",
        sampleBody: { text: "{{text}}", speaker: "p335", language: "en" },
      }),
      create: expect.objectContaining({
        capability: "tts",
        url: "{your tts endpoint}",
        sampleBody: { text: "{{text}}", speaker: "p335", language: "en" },
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        capability: "tts",
        enabled: true,
        url: "{your tts endpoint}",
      }),
    );
  });

  it("reads public n8n webhook env status without returning the JWT", async () => {
    vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.example/");
    vi.stubEnv("N8N_WEBHOOK_JWT_KEY", "secret");

    const caller = aiRouter.createCaller(createContext());
    await expect(caller.getWebhookConfig()).resolves.toEqual({
      configured: true,
      baseUrl: "https://n8n.example/",
      hasBaseUrl: true,
      hasJwtKey: true,
    });
  });

  it("requires admin access for saving speech config", async () => {
    const caller = aiRouter.createCaller(createContext("user"));

    await expect(
      caller.saveSpeechConfig({
        capability: "tts",
        provider: "custom",
        enabled: true,
        url: "{your tts endpoint}",
        sampleBody: JSON.stringify({ text: "{{text}}" }),
      }),
    ).rejects.toThrow("Admin access is required");
  });

  it("rejects invalid speech config URLs", async () => {
    const caller = aiRouter.createCaller(createContext());

    await expect(
      caller.saveSpeechConfig({
        capability: "tts",
        provider: "custom",
        enabled: true,
        url: "ftp://{your tts endpoint}",
        sampleBody: "{}",
      }),
    ).rejects.toThrow("Speech endpoint URL must use http or https");
  });

  it("rejects invalid speech config sample bodies", async () => {
    const caller = aiRouter.createCaller(createContext());

    await expect(
      caller.saveSpeechConfig({
        capability: "tts",
        provider: "custom",
        enabled: true,
        url: "{your tts endpoint}",
        sampleBody: "{",
      }),
    ).rejects.toThrow();
  });
});
