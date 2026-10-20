"use client";
import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { createAuthSchemas } from "@workspace/auth/utils/zod";

/** The auth form schemas with validation messages in the active language. */
export function useAuthSchemas() {
  const t = useTranslations("auth.validation");
  return useMemo(
    () =>
      createAuthSchemas({
        emailRequired: t("emailRequired"),
        emailInvalid: t("emailInvalid"),
        nameRequired: t("nameRequired"),
        nameMax: t("nameMax"),
        passwordRequired: t("passwordRequired"),
        passwordMin: t("passwordMin"),
        passwordMax: t("passwordMax"),
        confirmPasswordRequired: t("confirmPasswordRequired"),
        confirmPasswordMin: t("confirmPasswordMin"),
        confirmPasswordMax: t("confirmPasswordMax"),
        passwordsMismatch: t("passwordsMismatch"),
      }),
    [t],
  );
}
