import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { adminClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export const authClient: any = createAuthClient({
    baseURL,
    plugins:
        Platform.OS !== "web"
            ? [
                  expoClient({
                      scheme: "myapp",
                      storagePrefix: "myapp",
                      storage: SecureStore,
                  }),
                  adminClient(),
              ]
            : [adminClient()],
    ...(Platform.OS === "web" && {
        fetchOptions: { credentials: "include" as const },
    }),
});

export const { signIn, signOut, useSession } = authClient;
