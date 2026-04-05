import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useState } from "react";
// Renamed to avoid collision with the TRPCProvider from createTRPCContext
import { TRPCProvider as TRPCContextProvider } from "./lib/trpc";
import { buildTrpcUrl } from "./lib/api-base-url";
import App from "./App";

export default function TRPCProvider() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    createTRPCClient<any>({
      links: [
        httpBatchLink({
          url: buildTrpcUrl(import.meta.env.VITE_API_URL),
          async fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCContextProvider trpcClient={trpcClient} queryClient={queryClient}>
        <App />
      </TRPCContextProvider>
    </QueryClientProvider>
  );
}
