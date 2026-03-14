"use client";
import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

const _baseURL = (() => {
    // Next.js environment (process.env is defined)
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_URL) {
        return process.env.NEXT_PUBLIC_URL;
    }
    // Vite/Electron renderer environmentaa
    // @ts-ignore - Bypass "The 'import.meta' meta-property is not allowed in files which will build into CommonJS output."
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
        // @ts-ignore
        return (import.meta as any).env.VITE_API_URL.replace('/api/trpc', '');
    }
    return undefined; // let better-auth use same domain
})();

export const authClient:any = createAuthClient({
    /** the base url of the server (optional if you're using the same domain) */
    baseURL: _baseURL,
    fetchOptions: {
        credentials: "include"
    },
    plugins: [adminClient()]
})

export const { signIn, signOut, useSession } = authClient;
