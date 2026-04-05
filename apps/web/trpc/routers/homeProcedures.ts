import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { auth } from "@workspace/auth/better-auth/auth";
import { AddPasswordSchema } from "@workspace/auth/utils/zod";


export const homeRouter = createTRPCRouter({
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
