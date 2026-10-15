"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient, useSession } from "@workspace/auth/better-auth/auth-client";
import type { Locale } from "@workspace/i18n/config";
import { setLocaleCookie } from "@workspace/i18n/cookie";

/**
 * Switches the UI language. A signed-in user's choice is saved on their
 * account (it outranks the cookie), so a failed save must not look like success.
 */
export function useChangeLocale() {
  const router = useRouter();
  const t = useTranslations("common");
  const { data: session } = useSession();
  return async (locale: Locale) => {
    setLocaleCookie(locale);
    const user = session?.user;
    if (user && user.role !== "guest") {
      const { error } = await authClient.updateUser({ locale });
      if (error) {
        toast.error(t("languageSaveFailed"));
        return;
      }
    }
    router.refresh();
  };
}
