import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { auth } from "@workspace/auth/better-auth/auth";
import { LOCALE_COOKIE, resolveLocale } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";
import { getSiteConfig } from "@/lib/site-config/service";

// No URL prefix: the language comes from the user, their cookie, their
// browser, then the site default (admin-editable in /admin/settings).
export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const [session, cookieStore, config] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }).catch(() => null),
    cookies(),
    getSiteConfig(),
  ]);
  const locale = resolveLocale({
    userLocale: session?.user?.locale,
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
    siteDefault: config["i18n.defaultLocale"],
  });
  return { locale, messages: getMessages(locale), onError: onIntlError };
});
