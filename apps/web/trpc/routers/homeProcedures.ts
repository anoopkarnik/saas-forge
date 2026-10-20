import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { auth } from "@workspace/auth/better-auth/auth";
import { AddPasswordSchema } from "@workspace/auth/utils/zod";
import db from "@workspace/database/client";
import { flagProcedure } from "@/trpc/flag-procedure";


export const homeRouter = createTRPCRouter({
    /** Example of a flagged procedure: FORBIDDEN unless beta.dashboardWidgets is on for the caller. */
    betaWidgets: flagProcedure("beta.dashboardWidgets").query(async ({ ctx }) => {
        const user = await db.user.findUnique({
            where: { id: ctx.session.user.id },
            select: { createdAt: true, creditsTotal: true, creditsUsed: true },
        });
        return {
            memberSinceDays: user ? Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000) : 0,
            creditsRemaining: user ? Math.max(user.creditsTotal - user.creditsUsed, 0) : 0,
        };
    }),
    setPassword: protectedProcedure
        .input(AddPasswordSchema)
        .mutation(async ({ input, ctx }) => {
            const { newPassword, confirmPassword } = input;
            
            const result = await auth.api.setPassword({
                body: { newPassword },
                headers: ctx.headers
            }); 
            
            return { success: true };
        }),
});
