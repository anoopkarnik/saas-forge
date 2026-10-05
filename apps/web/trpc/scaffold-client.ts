"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useMemo } from "react";
import type { AppRouter } from "./routers/_app";

// Procedures that read the starter source on disk (file preview, build keys,
// upgrade previews) must go to /api/scaffold/trpc: only that function ships the
// template. Everything else keeps using useTRPC().
const scaffoldClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/scaffold/trpc" })],
});

export function useScaffoldTRPC() {
  const queryClient = useQueryClient();
  return useMemo(() => createTRPCOptionsProxy<AppRouter>({ client: scaffoldClient, queryClient }), [queryClient]);
}
