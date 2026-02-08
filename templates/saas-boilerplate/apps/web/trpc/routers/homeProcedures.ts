import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { auth } from "@/lib/auth-server";
import { AddPasswordSchema } from "@workspace/auth/utils/zod";
import { headers } from "next/headers";


export const homeRouter = createTRPCRouter({
    setPassword: protectedProcedure
        .input(AddPasswordSchema)
        .mutation(async ({ input, ctx }) => {
            const { newPassword, confirmPassword } = input;
            
            const result = await auth.api.setPassword({
                body: { newPassword },
                headers: await headers()
            });
            
            return { success: true };
        }),
});