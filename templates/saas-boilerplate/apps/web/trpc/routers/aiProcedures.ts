import { adminProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  faqFormSchema,
  featuresFormSchema,
  heroFormSchema,
  legalFormSchema,
  navbarFormSchema,
  pricingFormSchema,
  testimonialsFormSchema,
} from "@/lib/zod/cms";
import {
  mergeSpeechConfig,
  normalizeSpeechUrl,
  parseSpeechSampleBody,
  type SpeechCapability,
} from "@/lib/aiSpeech";
import { getAIConfigStatus, resolveAIModel } from "@workspace/ai";
import db from "@workspace/database/client";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { z } from "zod";

const promptKeySchema = z.string().min(1).max(120);
const speechCapabilitySchema = z.enum(["tts", "stt"]);
const speechProviderSchema = z.enum(["custom", "openai"]);
const speechCapabilities: SpeechCapability[] = ["tts", "stt"];
const cmsAssistantSectionSchema = z.enum([
  "navbar",
  "hero",
  "features",
  "testimonials",
  "pricing",
  "faq",
  "legal",
]);

const assistantPrompts = [
  {
    key: "chat.assistant",
    name: "Chat Assistant",
    description: "General-purpose assistant used by the authenticated AI chat.",
  },
  {
    key: "documentation.assistant",
    name: "Documentation Assistant",
    description: "Drafts and fills documentation pages in the admin documentation editor.",
  },
  {
    key: "cms.assistant",
    name: "CMS Assistant",
    description: "Drafts and fills landing page CMS section forms.",
  },
] as const;

const assistantPromptKeys = assistantPrompts.map((prompt) => prompt.key);
const cmsDraftSchemas = {
  navbar: navbarFormSchema,
  hero: heroFormSchema,
  features: featuresFormSchema,
  testimonials: testimonialsFormSchema,
  pricing: pricingFormSchema,
  faq: faqFormSchema,
  legal: legalFormSchema,
} as const;

function getAssistantPromptDefault(promptKey: string) {
  return assistantPrompts.find((prompt) => prompt.key === promptKey);
}

function parseJsonObject(text: string) {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The assistant did not return JSON.",
    });
  }

  try {
    return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The assistant returned invalid JSON.",
    });
  }
}

function buildAdminDraftPrompt({
  kind,
  section,
  current,
  instruction,
}: {
  kind: "documentation" | "cms";
  section?: z.infer<typeof cmsAssistantSectionSchema>;
  current: Record<string, unknown>;
  instruction?: string;
}) {
  const currentJson = JSON.stringify(current, null, 2);
  const instructionText = instruction?.trim()
    ? `\nAdditional instructions:\n${instruction.trim()}\n`
    : "";

  if (kind === "documentation") {
    return `Fill this documentation form. Return only JSON with these exact keys: title, slug, type, order, content. Content must be useful Markdown or MDX.\nCurrent form values:\n${currentJson}${instructionText}`;
  }

  return `Fill the ${section} CMS form. Return only JSON containing fields for that section, using the same keys and shapes as the current form values. Preserve image URLs when you cannot improve them.\nCurrent form values:\n${currentJson}${instructionText}`;
}

export const aiRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async () => {
    const status = getAIConfigStatus();
    return {
      enabled: status.enabled,
      configured: status.configured,
      reason: status.reason,
      provider: status.provider,
      providers: status.providers,
      model: status.model,
    };
  }),

  getPrompts: adminProcedure.query(async () => {
    const prompts = await (db as any).aiPrompt.findMany({
      where: { key: { in: assistantPromptKeys } },
      include: { activeVersion: true },
      orderBy: { key: "asc" },
    });

    return assistantPrompts.map((defaultPrompt) => {
      const saved = prompts.find((prompt: any) => prompt.key === defaultPrompt.key);

      return saved
        ? {
            ...saved,
            name: saved.name || defaultPrompt.name,
            description: saved.description || defaultPrompt.description,
          }
        : {
            id: defaultPrompt.key,
            key: defaultPrompt.key,
            name: defaultPrompt.name,
            description: defaultPrompt.description,
            activeVersionId: null,
            activeVersion: null,
          };
    });
  }),

  getPromptVersions: adminProcedure
    .input(z.object({ promptKey: promptKeySchema }))
    .query(async ({ input }) => {
      const prompt = await (db as any).aiPrompt.findUnique({
        where: { key: input.promptKey },
        include: {
          activeVersion: true,
          versions: { orderBy: { version: "desc" } },
        },
      });

      if (prompt) {
        return prompt;
      }

      const defaultPrompt = getAssistantPromptDefault(input.promptKey);
      if (!defaultPrompt) {
        return null;
      }

      return {
        id: defaultPrompt.key,
        key: defaultPrompt.key,
        name: defaultPrompt.name,
        description: defaultPrompt.description,
        activeVersionId: null,
        activeVersion: null,
        versions: [],
      };
    }),

  createPromptVersion: adminProcedure
    .input(
      z.object({
        promptKey: promptKeySchema,
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        content: z.string().min(1),
        provider: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
        activate: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.$transaction(async (tx) => {
        const prompt = await (tx as any).aiPrompt.upsert({
          where: { key: input.promptKey },
          update: {
            name: input.name,
            description: input.description,
          },
          create: {
            key: input.promptKey,
            name: input.name,
            description: input.description,
          },
        });

        const latest = await (tx as any).aiPromptVersion.findFirst({
          where: { promptId: prompt.id },
          orderBy: { version: "desc" },
          select: { version: true },
        });

        const version = await (tx as any).aiPromptVersion.create({
          data: {
            promptId: prompt.id,
            version: (latest?.version ?? 0) + 1,
            content: input.content,
            provider: input.provider,
            model: input.model,
            createdByUserId: ctx.session.user.id,
          },
        });

        if (input.activate) {
          await (tx as any).aiPrompt.update({
            where: { id: prompt.id },
            data: { activeVersionId: version.id },
          });
        }

        return version;
      });
    }),

  updatePromptVersion: adminProcedure
    .input(
      z.object({
        promptKey: promptKeySchema,
        versionId: z.string().min(1),
        content: z.string().min(1),
        provider: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const prompt = await (db as any).aiPrompt.findUnique({
        where: { key: input.promptKey },
      });

      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      const version = await (db as any).aiPromptVersion.findFirst({
        where: { id: input.versionId, promptId: prompt.id },
      });

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt version not found" });
      }

      return (db as any).aiPromptVersion.update({
        where: { id: version.id },
        data: {
          content: input.content,
          provider: input.provider,
          model: input.model,
        },
      });
    }),

  deletePromptVersion: adminProcedure
    .input(
      z.object({
        promptKey: promptKeySchema,
        versionId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const prompt = await (db as any).aiPrompt.findUnique({
        where: { key: input.promptKey },
      });

      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      if (prompt.activeVersionId === input.versionId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Activate another version before deleting this one.",
        });
      }

      const version = await (db as any).aiPromptVersion.findFirst({
        where: { id: input.versionId, promptId: prompt.id },
      });

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt version not found" });
      }

      return (db as any).aiPromptVersion.delete({
        where: { id: version.id },
      });
    }),

  generateAdminDraft: adminProcedure
    .input(
      z.object({
        kind: z.enum(["documentation", "cms"]),
        section: cmsAssistantSectionSchema.optional(),
        current: z.record(z.string(), z.unknown()).default({}),
        instruction: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.kind === "cms" && !input.section) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CMS assistant section is required.",
        });
      }

      const promptKey =
        input.kind === "documentation" ? "documentation.assistant" : "cms.assistant";
      const prompt = await (db as any).aiPrompt.findUnique({
        where: { key: promptKey },
        include: { activeVersion: true },
      });

      if (!prompt?.activeVersion) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${input.kind === "documentation" ? "Documentation" : "CMS"} assistant prompt is not configured.`,
        });
      }

      const resolvedModel = resolveAIModel(process.env, {
        provider: prompt.activeVersion.provider as any,
        model: prompt.activeVersion.model ?? undefined,
      });
      const result = await generateText({
        model: resolvedModel.model,
        system: prompt.activeVersion.content,
        prompt: buildAdminDraftPrompt({
          kind: input.kind,
          section: input.section,
          current: input.current,
          instruction: input.instruction,
        }),
      });
      const parsed = parseJsonObject(result.text);

      if (input.kind === "documentation") {
        const values = z
          .object({
            title: z.string().trim().min(1),
            slug: z.string().trim().min(1),
            type: z.string().trim().min(1),
            order: z.coerce.number().int().min(0),
            content: z.string().min(1),
          })
          .parse(parsed);

        return { kind: input.kind, values };
      }

      const section = input.section as z.infer<typeof cmsAssistantSectionSchema>;
      const values = cmsDraftSchemas[section].parse(parsed);

      return { kind: input.kind, section, values };
    }),

  getAvailableModels: adminProcedure
    .input(z.object({ provider: z.string() }))
    .query(async ({ input }) => {
      const { listModels } = await import("@workspace/ai");
      return listModels(input.provider as any);
    }),

  getSpeechConfigs: adminProcedure.query(async () => {
    const records = await (db as any).aiSpeechConfig.findMany({
      where: { capability: { in: speechCapabilities } },
    });

    return speechCapabilities.map((capability) =>
      mergeSpeechConfig(
        records.find((record: any) => record.capability === capability),
        capability,
      ),
    );
  }),

  saveSpeechConfig: adminProcedure
    .input(
      z.object({
        capability: speechCapabilitySchema,
        provider: speechProviderSchema,
        enabled: z.boolean(),
        url: z.string().min(1, "URL is required"),
        sampleBody: z.string().min(1, "Sample body JSON is required"),
      }),
    )
    .mutation(async ({ input }) => {
      let url: string;
      let sampleBody: Record<string, unknown>;

      try {
        url = normalizeSpeechUrl(input.url);
        sampleBody = parseSpeechSampleBody(input.sampleBody);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid speech configuration.",
        });
      }

      const record = await (db as any).aiSpeechConfig.upsert({
        where: { capability: input.capability },
        update: {
          provider: input.provider,
          enabled: input.enabled,
          url,
          sampleBody,
        },
        create: {
          capability: input.capability,
          provider: input.provider,
          enabled: input.enabled,
          url,
          sampleBody,
        },
      });

      return mergeSpeechConfig(record, input.capability);
    }),

  activatePromptVersion: adminProcedure
    .input(
      z.object({
        promptKey: promptKeySchema,
        versionId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const prompt = await (db as any).aiPrompt.findUnique({
        where: { key: input.promptKey },
      });

      if (!prompt) {
        throw new Error("Prompt not found");
      }

      const version = await (db as any).aiPromptVersion.findFirst({
        where: { id: input.versionId, promptId: prompt.id },
      });

      if (!version) {
        throw new Error("Prompt version not found");
      }

      return (db as any).aiPrompt.update({
        where: { id: prompt.id },
        data: { activeVersionId: version.id },
        include: { activeVersion: true },
      });
    }),

  getUsageEvents: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(25),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return (db as any).aiUsageEvent.findMany({
        take: input?.limit ?? 25,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });
    }),
});
