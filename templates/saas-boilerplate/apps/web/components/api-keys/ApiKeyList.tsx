"use client";

import { ApiKeyList as ApiKeyListView } from "@workspace/ui/components/api-keys/ApiKeyList";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function ApiKeyList({ onCreateClick }: { onCreateClick: () => void }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const list = useQuery(trpc.apiKey.list.queryOptions());
  const revoke = useMutation(
    trpc.apiKey.revoke.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
      },
    }),
  );

  return (
    <ApiKeyListView
      rows={list.data ?? []}
      isLoading={list.isLoading}
      error={list.error?.message}
      isRevoking={revoke.isPending}
      onCreateClick={onCreateClick}
      onRevoke={(id) => revoke.mutateAsync({ id })}
    />
  );
}
