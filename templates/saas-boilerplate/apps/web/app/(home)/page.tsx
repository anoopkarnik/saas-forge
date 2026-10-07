"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { useFlag } from "@/components/flags/FlagsProvider";
import { useTRPC } from "@/trpc/client";
// scaffold:begin onboarding
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
// scaffold:end onboarding

/** An example of a flagged feature: visible, and its data served, only while beta.dashboardWidgets is on. */
function BetaWidgets() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.home.betaWidgets.queryOptions());
  if (!data) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Member for</CardDescription>
          <CardTitle className="text-3xl">{data.memberSinceDays} days</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Credits remaining</CardDescription>
          <CardTitle className="text-3xl">{data.creditsRemaining}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Beta widget (feature flag beta.dashboardWidgets)</CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  const showBetaWidgets = useFlag("beta.dashboardWidgets");
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* scaffold:begin onboarding */}
      <OnboardingPanel />
      {/* scaffold:end onboarding */}
      {showBetaWidgets ? <BetaWidgets /> : null}
    </div>
  );
}
