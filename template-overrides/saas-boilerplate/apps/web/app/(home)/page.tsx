"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { useFlag } from "@/components/flags/FlagsProvider";
import { useTRPC } from "@/trpc/client";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@workspace/i18n/config";
import { formatNumber } from "@workspace/i18n/format";
// scaffold:begin onboarding
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
// scaffold:end onboarding

/** An example of a flagged feature: visible, and its data served, only while beta.dashboardWidgets is on. */
function BetaWidgets() {
  const trpc = useTRPC();
  const t = useTranslations("home");
  const locale = useLocale() as Locale;
  const { data } = useQuery(trpc.home.betaWidgets.queryOptions());
  if (!data) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>{t("memberFor")}</CardDescription>
          <CardTitle className="text-3xl">{t("days", { count: data.memberSinceDays })}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{t("creditsRemaining")}</CardDescription>
          <CardTitle className="text-3xl">{formatNumber(data.creditsRemaining, locale)}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{t("betaWidget")}</CardContent>
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
