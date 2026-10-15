"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import type { Locale } from "@workspace/i18n/config";
import SettingsHeader from "@workspace/ui/components/home/SettingsHeader";
import { LocaleSwitcher } from "@workspace/ui/components/misc/LocaleSwitcher";

export default function LanguageSettings({ onLocaleChange }: { onLocaleChange: (locale: Locale) => void | Promise<void> }) {
  const t = useTranslations("settings.language");
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  return (
    <SettingsHeader title={t("title")} description={t("description")}>
      <LocaleSwitcher
        id="settings-locale"
        value={locale}
        disabled={pending}
        onChange={async (next) => {
          setPending(true);
          try {
            await onLocaleChange(next);
          } finally {
            setPending(false);
          }
        }}
        className="w-full max-w-xs"
      />
    </SettingsHeader>
  );
}
