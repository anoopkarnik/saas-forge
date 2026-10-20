import { z } from "zod";

export const AI_CHAT_MAX_MESSAGES = 100;
export const AI_CHAT_MAX_PARTS_PER_MESSAGE = 50;
export const AI_CHAT_MAX_TEXT_CHARS = 32_000;
// The middleware body limit only sees Content-Length, so cap aggregate text here too.
export const AI_CHAT_MAX_TOTAL_TEXT_CHARS = 200_000;

const messageIdSchema = z.string().min(1).max(128);

// The chat UI only sends text from users; system messages are server-owned (prompt versions).
const userTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(AI_CHAT_MAX_TEXT_CHARS),
});

// Assistant history echoes back SDK parts (text, reasoning, step-start, tool-*). Their
// structure is checked by `safeValidateUIMessages` in the route; here we bound size.
const assistantPartSchema = z.looseObject({
  type: z.string().min(1).max(100),
  text: z.string().max(AI_CHAT_MAX_TEXT_CHARS).optional(),
});

const aiChatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    id: messageIdSchema,
    role: z.literal("user"),
    parts: z.array(userTextPartSchema).min(1).max(AI_CHAT_MAX_PARTS_PER_MESSAGE),
  }),
  z.object({
    id: messageIdSchema,
    role: z.literal("assistant"),
    parts: z.array(assistantPartSchema).max(AI_CHAT_MAX_PARTS_PER_MESSAGE),
  }),
]);

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

export const aiChatRequestSchema = z.object({
  messages: z
    .array(aiChatMessageSchema)
    .min(1)
    .max(AI_CHAT_MAX_MESSAGES)
    .refine(
      (messages) =>
        messages
          .flatMap((message) => message.parts)
          .reduce((total, part) => total + (part.text?.length ?? 0), 0) <=
        AI_CHAT_MAX_TOTAL_TEXT_CHARS,
      { message: "Chat history is too large." },
    ),
  promptKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9._-]*$/i)
    .default("chat.assistant"),
});
