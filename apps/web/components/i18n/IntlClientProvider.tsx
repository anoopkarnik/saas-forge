"use client";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import type { Locale } from "@workspace/i18n/config";
import type { Messages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";

// Functions cannot cross the server/client boundary, so onError is set here.
export function IntlClientProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} onError={onIntlError}>
      {children}
    </NextIntlClientProvider>
  );
}
