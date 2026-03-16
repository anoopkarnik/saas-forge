import { betterAuth, BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import db from '@workspace/database/client';
import { admin,  openAPI, jwt } from "better-auth/plugins";
import { sendResetEmail, sendVerificationEmail } from "@workspace/email/resend/index"

// Better Auth's account linking flow calls db.delete() on records that may not
// exist (e.g. removing an old provider account before re-linking). Prisma throws
// P2025 on delete-of-nonexistent. We extend the client passed to the adapter so
// that P2025 on delete is silently ignored — only affects Better Auth, not the
// rest of the app.
const authDb = db.$extends({
    query: {
        $allModels: {
            async delete({ args, query }) {
                try {
                    return await query(args);
                } catch (error: any) {
                    if (error?.code === "P2025") return null as any;
                    throw error;
                }
            },
        },
    },
});

const options = {
    basePath: "/api/auth",
    baseURL: process.env.NEXT_PUBLIC_URL,
    plugins: [openAPI(),admin({
        impersonationSessionDuration: 3600
    })],
    trustedOrigins: [
        "myapp://",
        "myapp://*",
        "http://localhost:5173",
        process.env.NEXT_PUBLIC_URL || ""
    ].filter(Boolean),
    database: prismaAdapter(authDb, {
        provider: "postgresql",
    }),
    rateLimit:{
        window: 60,
        max: 100,
        customRules: {
            '/sign-in/email':{
                window: 60,
                max:3
            }
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 day
        updateAge: 60 * 60 * 24, // 1 day 
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        }
    },
    user: {
        additionalFields: {
            creditsUsed: {
                type: "number",
                required: false,
            },
            creditsTotal: {
                type: "number",
                required: false,
            },
        },
        changeEmail: {
            enabled: true,
            sendChangeEmailVerification: async ({user, newEmail, url, token}, request) => {
                await sendVerificationEmail(newEmail,url)
            }
        },
        deleteUser: {
            enabled: true,
            
        }
    },
    account:{
        accountLinking: {
            enabled: true,
            trustedProviders: ['google','github','linkedin']
        }
    },
    socialProviders: {
        github: {
            clientId: process.env.AUTH_GITHUB_CLIENT_ID ?? "",
            clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET ?? "",
        },
        google: {
            clientId: process.env.AUTH_GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET ?? "",
        },
        linkedin: {
            clientId: process.env.AUTH_LINKEDIN_CLIENT_ID ?? "",
            clientSecret: process.env.AUTH_LINKEDIN_CLIENT_SECRET ?? "",
        }
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        requireEmailVerification: true,
        sendResetPassword : async ({user, url}) =>{
            await sendResetEmail(user.email, url)
        }
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async({user,token})=>{
            console.log("Sending verification email to:", user.email);
            const fullUser = await db.user.findUnique({
                where: { id: user.id },
                include: {
                  accounts: true,
                },
              });
            
              const isSocial =
                fullUser?.accounts?.some((account:any) =>
                  ["google", "github", "linkedin"].includes(account.providerId)
                ) ?? false;
             console.log("isSocial:", isSocial);
              if (isSocial) {
                console.log("Skipping email verification for social login user");
                return;
              }
            
            const verificationUrl = `${process.env.NEXT_PUBLIC_URL}/api/auth/verify-email?token=${token}
            &callbackURL=${process.env.NEXT_PUBLIC_URL}/email-verified`;
            await sendVerificationEmail(user.email,verificationUrl)
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    const userCount = await db.user.count();
                    if (userCount === 1) {
                        await db.user.update({
                            where: { id: user.id },
                            data: { role: "admin" },
                        });
                    }
                },
            },
        },
    },
    advanced: {
        // crossSubDomainCookies fails on localhost (no valid TLD for domain extraction)
        // Only enable in production where the real domain is used
        crossSubDomainCookies: {
            enabled: process.env.NODE_ENV === "production"
        },
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
        }
    }

} satisfies BetterAuthOptions;

import { toNextJsHandler } from "better-auth/next-js";

// Use module-level variable for true singleton behavior
// This ensures only one instance is created per Node.js process
const createAuthInstance = () => {
    return betterAuth(options);
};

export const auth: any = createAuthInstance();

export type Session = typeof auth.$Infer.Session;
export const handlers = toNextJsHandler(auth);