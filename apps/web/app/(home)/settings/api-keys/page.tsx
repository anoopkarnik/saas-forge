import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { ApiKeysScreen } from "./_components/ApiKeysScreen";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery(trpc.apiKey.list.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ApiKeysScreen />
    </HydrationBoundary>
  );
}
