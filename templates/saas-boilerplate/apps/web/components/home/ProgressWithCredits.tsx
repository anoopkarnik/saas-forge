"use client";

import React from "react";
import { Progress } from "@workspace/ui/components/shadcn/progress";
import { useSession } from "@workspace/auth/better-auth/auth-client";

const ProgressWithCredits = () => {

    const { data: session } = useSession();

  // Show skeleton when session data is not available
  if (!session || !session.user || session.user.creditsUsed === undefined || session.user.creditsTotal === undefined) {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs">Credits Used</div>
        <div className="text-xs">{`${session.user.creditsUsed}/${session.user.creditsTotal}`}</div>
      </div>
      <Progress value={(session.user.creditsUsed * 100) / session.user.creditsTotal} />
    </div>
  );
};

export default ProgressWithCredits;
