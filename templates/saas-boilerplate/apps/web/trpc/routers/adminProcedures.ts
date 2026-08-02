import { randomBytes } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import db from "@workspace/database/client";
import { sendInvitationEmail } from "@workspace/email/resend/index";
import { createTRPCRouter, baseProcedure, adminProcedure } from "../init";

const settingsRouter = createTRPCRouter({
  registrationMode: baseProcedure.query(async () => {
    const setting = await db.appSetting.findUnique({
      where: { key: "registration_mode" },
    });
    return setting?.value === "INVITE_ONLY" ? "INVITE_ONLY" : "OPEN";
  }),

  setRegistrationMode: adminProcedure
    .input(z.object({ mode: z.enum(["OPEN", "INVITE_ONLY"]) }))
    .mutation(async ({ input }) => {
      await db.appSetting.upsert({
        where: { key: "registration_mode" },
        update: { value: input.mode },
        create: { key: "registration_mode", value: input.mode },
      });
      return { mode: input.mode };
    }),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";

const buildInviteUrl = (token: string, email: string) =>
  `${appUrl}/sign-up?invite=${token}&email=${encodeURIComponent(email)}`;

const invitesRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    return db.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true, email: true } } },
    });
  }),

  create: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();

      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with that email already exists." });
      }

      const activeInvite = await db.invitation.findFirst({
        where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
      });
      if (activeInvite) {
        throw new TRPCError({ code: "CONFLICT", message: "An active invitation already exists for that email." });
      }

      const token = randomBytes(32).toString("hex");
      const invitation = await db.invitation.create({
        data: {
          email,
          token,
          status: "PENDING",
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          invitedById: ctx.session.user.id,
        },
      });

      await sendInvitationEmail(email, buildInviteUrl(token, email), company);
      return invitation;
    }),

  revoke: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.invitation.update({ where: { id: input.id }, data: { status: "REVOKED" } });
      return { id: input.id };
    }),

  resend: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.invitation.findUnique({ where: { id: input.id } });
      if (!existing || existing.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending invitations can be resent." });
      }
      const token = randomBytes(32).toString("hex");
      const updated = await db.invitation.update({
        where: { id: input.id },
        data: { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      });
      await sendInvitationEmail(existing.email, buildInviteUrl(token, existing.email), company);
      return updated;
    }),

  validate: baseProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await db.invitation.findUnique({ where: { token: input.token } });
      if (!invite) return { email: null, valid: false, expired: false };
      const expired = invite.expiresAt.getTime() <= Date.now();
      const valid = invite.status === "PENDING" && !expired;
      return { email: invite.email, valid, expired };
    }),
});

export const adminRouter = createTRPCRouter({
  settings: settingsRouter,
  invites: invitesRouter,
});
