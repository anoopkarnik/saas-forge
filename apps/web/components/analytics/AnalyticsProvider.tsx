"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { getConsent, identify, initAnalytics, reset, setConsent } from "@workspace/analytics/client";
import { group } from "@workspace/analytics/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useSiteConfig } from "@/components/site-config/SiteConfigProvider";

/**
 * Starts browser analytics, links it to the signed-in user (id only) and, when
 * the `analytics.consentRequired` setting is on, asks before anything loads.
 */
export function AnalyticsProvider() {
  const consentRequired = useSiteConfig()["analytics.consentRequired"];
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const previousUserId = useRef<string | undefined>(undefined);
  // Read after mount: the server cannot know the cookie's latest value.
  const [askConsent, setAskConsent] = useState(false);

  useEffect(() => {
    initAnalytics({ consentRequired });
    setAskConsent(consentRequired && getConsent() === null);
  }, [consentRequired]);

  useEffect(() => {
    if (userId) identify(userId);
    else if (previousUserId.current) reset();
    previousUserId.current = userId;
  }, [userId]);

  const organizationId = (session?.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId;
  useEffect(() => {
    if (organizationId) group("organization", organizationId);
  }, [organizationId]);

  if (!askConsent) return null;
  return (
    <ConsentBanner
      onChoose={(consent) => {
        setConsent(consent);
        setAskConsent(false);
      }}
    />
  );
}

function ConsentBanner({ onChoose }: { onChoose: (consent: "granted" | "denied") => void }) {
  const t = useTranslations("analytics.consent");
  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg sm:flex-row sm:items-center"
    >
      <p className="text-sm text-muted-foreground">{t("message")}</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => onChoose("denied")}>
          {t("decline")}
        </Button>
        <Button size="sm" onClick={() => onChoose("granted")}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
