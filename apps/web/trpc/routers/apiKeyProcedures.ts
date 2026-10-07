import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "@workspace/database/client";
import {
  API_KEY_SCOPES,
  generateApiKey,
  isValidScope,
  type ApiKeyScope,
} from "@workspace/auth/api-keys";
import { logger } from "@workspace/observability/winston-logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
// scaffold:begin audit_log
import { audit, userActor } from "@/lib/audit/audit";
// scaffold:end audit_log

const scopeSchema = z
  .string()
  .refine(isValidScope, { message: "Unknown API key scope." });

const createInput = z.object({
  label: z.string().trim().min(1).max(100),
  scopes: z.array(scopeSchema).min(1).max(API_KEY_SCOPES.length),
  expiresAt: z.coerce.date().optional(),
});

const revokeInput = z.object({ id: z.string().min(1) });

const listSelect = {
  id: true,
  label: true,
  keyPrefix: true,
  scopes: true,
  status: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

export const apiKeyRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.apiKey.findMany({
      where: { userId: ctx.session.user.id },
      select: listSelect,
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const generated = generateApiKey();
      const row = await db.$transaction(async (tx) => {
        const created = await tx.apiKey.create({
          data: {
            userId: ctx.session.user.id,
            label: input.label,
            keyPrefix: generated.prefix,
            keyHash: generated.hash,
            scopes: input.scopes as ApiKeyScope[],
            expiresAt: input.expiresAt ?? null,
          },
          select: listSelect,
        });
        // scaffold:begin audit_log
        await audit(tx, "api_key.created", {
          actor: userActor(ctx.session.user.id),
          targetId: created.id,
          metadata: { label: input.label, keyPrefix: generated.prefix, scopes: input.scopes },
          headers: ctx.headers,
        });
        // scaffold:end audit_log
        return created;
      });
      logger.info(
        `apiKey.created ${JSON.stringify({
          userId: ctx.session.user.id,
          keyId: row.id,
          scopes: input.scopes,
        })}`,
      );
      return { key: row, plaintext: generated.plaintext };
    }),

  revoke: protectedProcedure
    .input(revokeInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.apiKey.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found.",
        });
      }
      const row = await db.$transaction(async (tx) => {
        const revoked = await tx.apiKey.update({
          where: { id: existing.id },
          data: { status: "revoked", revokedAt: new Date() },
          select: { id: true, status: true, revokedAt: true },
        });
        // scaffold:begin audit_log
        await audit(tx, "api_key.revoked", {
          actor: userActor(ctx.session.user.id),
          targetId: revoked.id,
          metadata: {},
          headers: ctx.headers,
        });
        // scaffold:end audit_log
        return revoked;
      });
      logger.info(
        `apiKey.revoked ${JSON.stringify({
          userId: ctx.session.user.id,
          keyId: row.id,
        })}`,
      );
      return row;
    }),
});
