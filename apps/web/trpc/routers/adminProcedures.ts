import { z } from "zod";
import db from "@workspace/database/client";
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

export const adminRouter = createTRPCRouter({
  settings: settingsRouter,
});
