"use client";

import React, { useEffect } from "react";
import { Progress } from "@workspace/ui/components/shadcn/progress";
import { Loader2Icon } from "lucide-react";
import { useSession } from "@workspace/auth/better-auth/auth-client";

const ProgressWithCredits = () => {

    const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs">Credits Used</div>
        <div className="text-xs">{`${session?.user?.creditsUsed}/${session?.user?.creditsTotal}`}</div>
      </div>
      <Progress value={(session?.user?.creditsUsed * 100) / session?.user?.creditsTotal} />
    </div>
  );
};

export default ProgressWithCredits;
