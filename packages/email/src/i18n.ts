import { createTranslator } from "use-intl";
import { DEFAULT_LOCALE, type Locale } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";

/** Email copy in the recipient's language (outside React, no provider needed). */
export function emailTranslator(locale: Locale = DEFAULT_LOCALE) {
  return createTranslator({ locale, messages: getMessages(locale), namespace: "email" });
}
