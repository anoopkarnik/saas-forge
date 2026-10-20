import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { IntlProvider } from "use-intl";
import { DEFAULT_LOCALE, type Locale } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";

/** Renders inside an IntlProvider, as the apps do. Missing keys throw in tests. */
export function renderWithIntl(ui: ReactElement, { locale = DEFAULT_LOCALE, ...options }: { locale?: Locale } & RenderOptions = {}): RenderResult {
  return render(
    <IntlProvider locale={locale} messages={getMessages(locale)} onError={onIntlError}>
      {ui}
    </IntlProvider>,
    options,
  );
}
