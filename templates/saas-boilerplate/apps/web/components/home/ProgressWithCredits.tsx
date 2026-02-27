"use client";

import React from "react";
import { Progress } from "@workspace/ui/components/shadcn/progress";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

const ProgressWithCredits = () => {

  const { data: session } = useSession();
  const trpc = useTRPC();
  const { data: creditsData } = useQuery({
    ...trpc.billing.getCreditsBalance.queryOptions(),
    enabled: !!session?.user?.id,
  });

  // Show skeleton when session data is not available
  if (!session || !session.user || (creditsData?.creditsUsed === undefined && session.user.creditsUsed === undefined) || (creditsData?.creditsTotal === undefined && session.user.creditsTotal === undefined)) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-sidebar-accent/50 rounded animate-pulse" />
          <div className="h-3 w-12 bg-sidebar-accent/50 rounded animate-pulse" />
        </div>
        <div className="h-2 w-full bg-sidebar-accent/50 rounded animate-pulse" />
      </div>
    );
  }

  const creditsTotal = creditsData?.creditsTotal ?? session.user.creditsTotal ?? 0;
  const creditsUsed = creditsData?.creditsUsed ?? session.user.creditsUsed ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs">Credits Used</div>
        <div className="text-xs">{`${creditsUsed}/${creditsTotal}`}</div>
      </div>
      <Progress value={(creditsUsed * 100) / creditsTotal} />
    </div>
  );
};

export default ProgressWithCredits;
