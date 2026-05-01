import { auth } from "@workspace/auth/better-auth/auth";
import db from "@workspace/database/client";
import { logAIEvent } from "@workspace/observability/ai-logger";
import {
  calculateAIUsageCredits,
  getAIConfigStatus,
  getLastUserMessageText,
  getMessageText,
  resolveAIModel,
  starterAssistantTools,
} from "@workspace/ai";
import {
  AI_WEBHOOK_MODEL,
  AI_WEBHOOK_PROVIDER,
  DEFAULT_N8N_WEBHOOK_TEMPLATE,
} from "@/lib/ts-types/ai";
import {
  callAIWebhook,
  createTextUIMessageStreamResponse,
} from "@/lib/functions/aiWebhook";
import {
  getN8nWebhookEnvConfig,
  isN8nWebhookProvider,
} from "@/lib/helper/aiWebhook";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const chatRequestSchema = z.object({
  messages: z.array(z.any()).min(1),
  promptKey: z.string().min(1).default("chat.assistant"),
});

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      code: error.name || "AI_PROVIDER_ERROR",
      message: error.message || "The AI provider failed to respond.",
    };
  }

  return {
    code: "AI_PROVIDER_ERROR",
    message: "The AI provider failed to respond.",
  };
}

function toWebhookMessages(messages: unknown[]) {
  return messages
    .map((message: any) => ({
      role: typeof message?.role === "string" ? message.role : "user",
      content: getMessageText(message),
    }))
    .filter((message) => message.content);
}

async function recordFailure({
  userId,
  conversationId,
  promptKey,
  promptVersionId,
  provider,
  model,
  latencyMs,
  error,
}: {
  userId: string;
  conversationId?: string | null;
  promptKey: string;
  promptVersionId?: string | null;
  provider?: string | null;
  model?: string | null;
  latencyMs: number;
  error: unknown;
}) {
  const safeError = sanitizeError(error);

  await (db as any).aiUsageEvent.create({
    data: {
      userId,
      conversationId,
      promptKey,
      promptVersionId,
      provider: provider ?? "unknown",
      model: model ?? "unknown",
      status: "failed",
      latencyMs,
      errorCode: safeError.code,
      errorMessage: safeError.message.slice(0, 500),
      creditsCharged: 0,
    },
  });

  logAIEvent({
    userId,
    promptKey,
    promptVersionId,
    provider,
    model,
    latencyMs,
    status: "failed",
    errorCode: safeError.code,
    errorMessage: safeError.message.slice(0, 500),
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user?.id) {
    return jsonError("You must be logged in to use AI chat.", 401);
  }

  const parsed = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid AI chat request.", 400);
  }

  const { messages, promptKey } = parsed.data;
  const userId = session.user.id;

  const [user, prompt] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { creditsTotal: true, creditsUsed: true },
    }),
    (db as any).aiPrompt.findUnique({
      where: { key: promptKey },
      include: { activeVersion: true },
    }),
  ]);

  if (!user || user.creditsTotal - user.creditsUsed < 1) {
    return jsonError("Not enough credits.", 403);
  }

  if (!prompt?.activeVersion) {
    return jsonError("AI prompt is not configured.", 404);
  }

  let resolvedModel: ReturnType<typeof resolveAIModel> | null = null;
  const activeProvider = prompt.activeVersion.provider;

  if (!isN8nWebhookProvider(activeProvider)) {
    const status = getAIConfigStatus();
    if (!status.configured) {
      return jsonError(status.reason ?? "AI is not configured.", 412);
    }

    try {
      resolvedModel = resolveAIModel(process.env, {
        provider: activeProvider as any,
        model: prompt.activeVersion.model ?? undefined,
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "AI prompt model is not configured.", 412);
    }
  }

  const latestUserText = getLastUserMessageText(messages);

  const conversation = await (db as any).aiConversation.create({
    data: {
      userId,
      promptKey,
      promptVersionId: prompt.activeVersion.id,
      title: latestUserText.slice(0, 80) || "AI chat",
    },
  });

  const persistedMessages = messages
    .map((message) => ({
      conversationId: conversation.id,
      userId,
      role: message.role ?? "user",
      content: getMessageText(message),
      parts: message.parts ?? null,
    }))
    .filter((message) => message.content || message.parts);

  if (persistedMessages.length) {
    await (db as any).aiMessage.createMany({ data: persistedMessages });
  }

  if (isN8nWebhookProvider(activeProvider)) {
    logAIEvent({
      userId,
      promptKey,
      promptVersionId: prompt.activeVersion.id,
      provider: AI_WEBHOOK_PROVIDER,
      model: AI_WEBHOOK_MODEL,
      status: "started",
    });

    try {
      const text = await callAIWebhook({
        config: getN8nWebhookEnvConfig(),
        path: prompt.activeVersion.model ?? "",
        template: prompt.activeVersion.content ?? DEFAULT_N8N_WEBHOOK_TEMPLATE,
        payload: {
          promptKey,
          system: null,
          messages: toWebhookMessages(messages),
          input: latestUserText,
          context: {
            flow: "chat",
            userId,
            conversationId: conversation.id,
          },
        },
      });
      const usage = calculateAIUsageCredits(null);
      const latencyMs = Date.now() - startedAt;

      await db.$transaction(async (tx) => {
        await (tx as any).aiMessage.create({
          data: {
            conversationId: conversation.id,
            userId,
            role: "assistant",
            content: text,
            parts: [{ type: "text", text }],
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { creditsUsed: { increment: usage.creditsCharged } },
        });

        await (tx as any).aiUsageEvent.create({
          data: {
            userId,
            conversationId: conversation.id,
            promptKey,
            promptVersionId: prompt.activeVersion.id,
            provider: AI_WEBHOOK_PROVIDER,
            model: AI_WEBHOOK_MODEL,
            requestTokens: usage.requestTokens,
            responseTokens: usage.responseTokens,
            totalTokens: usage.totalTokens,
            creditsCharged: usage.creditsCharged,
            latencyMs,
            status: "success",
          },
        });
      });

      logAIEvent({
        userId,
        promptKey,
        promptVersionId: prompt.activeVersion.id,
        provider: AI_WEBHOOK_PROVIDER,
        model: AI_WEBHOOK_MODEL,
        requestTokens: usage.requestTokens,
        responseTokens: usage.responseTokens,
        totalTokens: usage.totalTokens,
        creditsCharged: usage.creditsCharged,
        latencyMs,
        status: "success",
      });

      return createTextUIMessageStreamResponse(text, messages as UIMessage[]);
    } catch (error) {
      await recordFailure({
        userId,
        conversationId: conversation.id,
        promptKey,
        promptVersionId: prompt.activeVersion.id,
        provider: AI_WEBHOOK_PROVIDER,
        model: AI_WEBHOOK_MODEL,
        latencyMs: Date.now() - startedAt,
        error,
      });

      return jsonError("The assistant could not start a response.", 502);
    }
  }

  if (!resolvedModel) {
    return jsonError("AI prompt model is not configured.", 412);
  }

  logAIEvent({
    userId,
    promptKey,
    promptVersionId: prompt.activeVersion.id,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
    status: "started",
  });

  try {
    const result = streamText({
      model: resolvedModel.model,
      system: prompt.activeVersion.content,
      messages: await convertToModelMessages(messages as UIMessage[]),
      tools: starterAssistantTools,
      providerOptions:
        resolvedModel.provider === "gateway"
          ? {
              gateway: {
                user: userId,
                tags: [promptKey],
              },
            }
          : undefined,
      onFinish: async (finish) => {
        const finishData = finish as any;
        const usage = calculateAIUsageCredits(finishData.usage);
        const latencyMs = Date.now() - startedAt;
        const text = typeof finishData.text === "string" ? finishData.text : "";

        await db.$transaction(async (tx) => {
          await (tx as any).aiMessage.create({
            data: {
              conversationId: conversation.id,
              userId,
              role: "assistant",
              content: text,
              parts: finishData.response?.messages ?? null,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { creditsUsed: { increment: usage.creditsCharged } },
          });

          await (tx as any).aiUsageEvent.create({
            data: {
              userId,
              conversationId: conversation.id,
              promptKey,
              promptVersionId: prompt.activeVersion.id,
              provider: resolvedModel.provider,
              model: resolvedModel.modelId,
              requestTokens: usage.requestTokens,
              responseTokens: usage.responseTokens,
              totalTokens: usage.totalTokens,
              creditsCharged: usage.creditsCharged,
              latencyMs,
              status: "success",
            },
          });
        });

        logAIEvent({
          userId,
          promptKey,
          promptVersionId: prompt.activeVersion.id,
          provider: resolvedModel.provider,
          model: resolvedModel.modelId,
          requestTokens: usage.requestTokens,
          responseTokens: usage.responseTokens,
          totalTokens: usage.totalTokens,
          creditsCharged: usage.creditsCharged,
          latencyMs,
          status: "success",
        });
      },
    });

    return result.toUIMessageStreamResponse({
      onError: () => "The assistant could not finish this response.",
    });
  } catch (error) {
    await recordFailure({
      userId,
      conversationId: conversation.id,
      promptKey,
      promptVersionId: prompt.activeVersion.id,
      provider: resolvedModel.provider,
      model: resolvedModel.modelId,
      latencyMs: Date.now() - startedAt,
      error,
    });

    return jsonError("The assistant could not start a response.", 502);
  }
}
