"use client";

import { ChatPanel } from "@workspace/ui/components/ai/ChatPanel";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useFlag } from "@/components/flags/FlagsProvider";

export default function AIChatPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const voiceEnabled = useFlag("ai.voice");

  const statusQuery = useQuery(trpc.ai.getStatus.queryOptions());
  let isLoading = statusQuery.isLoading;
  let remainingCredits: number | null = null;
  // scaffold:begin billing
  const creditsQuery = useQuery(trpc.billing.getCreditsBalance.queryOptions());
  isLoading ||= creditsQuery.isLoading;
  remainingCredits = creditsQuery.data
    ? creditsQuery.data.creditsTotal - creditsQuery.data.creditsUsed
    : null;
  // scaffold:end billing

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = statusQuery.data;

  return (
    <ChatPanel
      voiceEnabled={voiceEnabled}
      remainingCredits={remainingCredits}
      disabled={!status?.configured}
      disabledReason={status?.reason}
      onFinish={() => {
        // scaffold:begin billing
        queryClient.invalidateQueries(trpc.billing.getCreditsBalance.queryFilter());
        // scaffold:end billing
      }}
    />
  );
}
