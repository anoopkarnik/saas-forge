import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { CHANNELS } from "@/lib/notifications/catalog";
import {
  UnknownNotificationTypeError,
  getPreferences,
  listInbox,
  markAllRead,
  markRead,
  setPreference,
  unreadCount,
} from "@/lib/notifications/service";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
// scaffold:begin multi_tenancy
import { getActiveOrganizationId } from "@/trpc/org";
// scaffold:end multi_tenancy

/** The organization whose notifications the inbox shows besides personal ones. */
const inboxOrganization: (sessionId: string | undefined) => Promise<string | null> =
  // scaffold:begin multi_tenancy
  getActiveOrganizationId ??
  // scaffold:end multi_tenancy
  (async () => null);

/** The signed-in user's notifications (notifications module). Guests can read but not mark read. */
export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).default({ limit: 20 }))
    .query(async ({ ctx, input }) =>
      listInbox(ctx.session.user.id, await inboxOrganization(ctx.session.session?.id), input.limit),
    ),
  unreadCount: protectedProcedure.query(async ({ ctx }) =>
    unreadCount(ctx.session.user.id, await inboxOrganization(ctx.session.session?.id)),
  ),
  markRead: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => markRead(ctx.session.user.id, input.id)),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) =>
    markAllRead(ctx.session.user.id, await inboxOrganization(ctx.session.session?.id)),
  ),
  preferences: createTRPCRouter({
    get: protectedProcedure.query(({ ctx }) => getPreferences(ctx.session.user.id)),
    set: protectedProcedure
      .input(z.object({ type: z.string().min(1), channel: z.enum(CHANNELS), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await setPreference(ctx.session.user.id, input.type, input.channel, input.enabled);
        } catch (error) {
          if (error instanceof UnknownNotificationTypeError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw error;
        }
      }),
  }),
});
