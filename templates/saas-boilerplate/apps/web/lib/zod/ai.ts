import {
  isN8nWebhookProvider,
  validateN8nWebhookJsonTemplate,
} from "@/lib/helper/aiWebhook";
import { z } from "zod";

export const promptKeySchema = z.string().min(1).max(120);
export const promptProviderSchema = z.string().min(1);

function refinePromptVersionInput(
  input: { provider: string; content?: string; model?: string },
  ctx: z.RefinementCtx,
) {
  if (isN8nWebhookProvider(input.provider)) {
    if (!input.model?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["model"],
        message: "Path is required for n8n webhook provider.",
      });
    }

    if (!input.content?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "JSON format is required for n8n webhook provider.",
      });
      return;
    }

    try {
      validateN8nWebhookJsonTemplate(input.content);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: error instanceof Error ? error.message : "Invalid n8n webhook JSON format.",
      });
    }

    return;
  }

  if (!input.content?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["content"],
      message: "Prompt is required for model providers.",
    });
  }

  if (!input.model?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["model"],
      message: "Model is required for model providers.",
    });
  }
}

export const createPromptVersionInputSchema = z
  .object({
    promptKey: promptKeySchema,
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    content: z.string().optional(),
    provider: promptProviderSchema,
    model: z.string().optional(),
    activate: z.boolean().default(true),
  })
  .superRefine(refinePromptVersionInput);

export const updatePromptVersionInputSchema = z
  .object({
    promptKey: promptKeySchema,
    versionId: z.string().min(1),
    content: z.string().optional(),
    provider: promptProviderSchema,
    model: z.string().optional(),
  })
  .superRefine(refinePromptVersionInput);
