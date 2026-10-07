import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { WebhookConfigError } from "@/lib/webhooks/signing";
import {
  createEndpoint,
  deleteEndpoint,
  listDeliveries,
  listEndpoints,
  replayDelivery,
  rotateSecret,
  sendTestEvent,
  updateEndpoint,
  WebhookInputError,
  type WebhookOwner,
} from "@/lib/webhooks/service";
import { createTRPCRouter, protectedProcedure } from "../init";
// scaffold:begin multi_tenancy
import db from "@workspace/database/client";
import { hasOrgRole } from "@workspace/auth/better-auth/organization-helpers";
import { getActiveOrganizationId } from "../org";
// scaffold:end multi_tenancy

// Outgoing webhooks (webhooks module). Endpoints belong to the signed-in user
// ("personal") or, with organizations, to the active workspace (its admins).
// Guests can read but every write is blocked by protectedProcedure.

const scope = z
  .enum([
    "personal",
    // scaffold:begin multi_tenancy
    "organization",
    // scaffold:end multi_tenancy
  ])
  .default("personal");

type Ctx = { session: { user: { id: string }; session?: { id?: string } } };

async function ownerFor(ctx: Ctx, which: z.infer<typeof scope>): Promise<WebhookOwner> {
  // scaffold:begin multi_tenancy
  if (which === "organization") {
    const organizationId = await getActiveOrganizationId(ctx.session.session?.id);
    if (!organizationId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No active organization." });
    const member = await db.member.findUnique({
      where: { organizationId_userId: { organizationId, userId: ctx.session.user.id } },
      select: { role: true },
    });
    if (!member || !hasOrgRole(member.role, "admin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Workspace webhooks need the admin role or higher." });
    }
    return { organizationId };
  }
  // scaffold:end multi_tenancy
  return { ownerUserId: ctx.session.user.id };
}

function orNotFound<T>(value: T | null, what = "Webhook endpoint"): T {
  if (value === null) throw new TRPCError({ code: "NOT_FOUND", message: `${what} not found.` });
  return value;
}

async function inputErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof WebhookInputError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    if (error instanceof WebhookConfigError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
    throw error;
  }
}

const id = z.string().min(1);
const endpointFields = {
  url: z.string().trim().min(1).max(2048),
  description: z.string().trim().max(200),
  events: z.array(z.string()).min(1).max(50),
};

export const webhookRouter = createTRPCRouter({
  eventTypes: protectedProcedure.query(() =>
    Object.entries(WEBHOOK_EVENTS).map(([type, { description }]) => ({ type, description })),
  ),

  list: protectedProcedure
    .input(z.object({ scope }).default({ scope: "personal" }))
    .query(async ({ ctx, input }) => listEndpoints(await ownerFor(ctx, input.scope))),

  create: protectedProcedure
    .input(z.object({ scope, url: endpointFields.url, description: endpointFields.description.optional(), events: endpointFields.events }))
    .mutation(async ({ ctx, input: { scope: which, ...fields } }) => {
      const owner = await ownerFor(ctx, which);
      return inputErrors(() => createEndpoint(owner, fields));
    }),

  update: protectedProcedure
    .input(
      z.object({
        scope,
        id,
        url: endpointFields.url.optional(),
        description: endpointFields.description.optional(),
        events: endpointFields.events.optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { scope: which, id: endpointId, ...patch } }) => {
      const owner = await ownerFor(ctx, which);
      return orNotFound(await inputErrors(() => updateEndpoint(owner, endpointId, patch)));
    }),

  delete: protectedProcedure.input(z.object({ scope, id })).mutation(async ({ ctx, input }) => {
    orNotFound((await deleteEndpoint(await ownerFor(ctx, input.scope), input.id)) || null);
    return { success: true };
  }),

  /** Returns the new secret once; the old one keeps signing for 24 hours. */
  rotateSecret: protectedProcedure.input(z.object({ scope, id })).mutation(async ({ ctx, input }) => {
    const owner = await ownerFor(ctx, input.scope);
    return orNotFound(await inputErrors(() => rotateSecret(owner, input.id)));
  }),

  sendTest: protectedProcedure.input(z.object({ scope, id })).mutation(async ({ ctx, input }) => {
    const owner = await ownerFor(ctx, input.scope);
    return { deliveryId: orNotFound(await inputErrors(() => sendTestEvent(owner, input.id))) };
  }),

  deliveries: protectedProcedure
    .input(z.object({ scope, endpointId: id, cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) =>
      orNotFound(await listDeliveries(await ownerFor(ctx, input.scope), input.endpointId, input)),
    ),

  replay: protectedProcedure.input(z.object({ scope, deliveryId: id })).mutation(async ({ ctx, input }) => {
    const owner = await ownerFor(ctx, input.scope);
    return { deliveryId: orNotFound(await inputErrors(() => replayDelivery(owner, input.deliveryId)), "Delivery") };
  }),
});
