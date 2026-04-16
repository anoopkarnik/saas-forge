"use client";

import { ChatPanel } from "@workspace/ui/components/ai/ChatPanel";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AIChatPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const statusQuery = useQuery(trpc.ai.getStatus.queryOptions());
  const creditsQuery = useQuery(trpc.billing.getCreditsBalance.queryOptions());

  if (statusQuery.isLoading || creditsQuery.isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const remainingCredits = creditsQuery.data
    ? creditsQuery.data.creditsTotal - creditsQuery.data.creditsUsed
    : null;
  const status = statusQuery.data;

  return (
    <ChatPanel
      remainingCredits={remainingCredits}
      disabled={!status?.configured}
      disabledReason={status?.reason}
      onFinish={() => {
        queryClient.invalidateQueries(trpc.billing.getCreditsBalance.queryFilter());
      }}
    />
  );
}
