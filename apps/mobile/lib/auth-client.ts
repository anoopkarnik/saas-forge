import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const _baseURL = (() => {
    // Expo environment
    if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    return undefined; // let better-auth use same domain
})();

export const authClient: any = createAuthClient({
    baseURL: _baseURL,
    fetchOptions: {
        credentials: "include",
    },
    plugins: [adminClient()],
});

export const { signIn, signOut, useSession } = authClient;
