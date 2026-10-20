"use client";
import { useTranslations } from "use-intl";
import { LOCALES, type Locale } from "@workspace/i18n/config";
import { cn } from "@workspace/ui/lib/utils";

export interface LocaleSwitcherProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function LocaleSwitcher({ value, onChange, disabled, className, id = "locale-switcher" }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  return (
    <>
      <label htmlFor={id} className="sr-only">{t("language")}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Locale)}
        className={cn("min-h-10 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring", className)}
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>{t(`locales.${locale}`)}</option>
        ))}
      </select>
    </>
  );
}
