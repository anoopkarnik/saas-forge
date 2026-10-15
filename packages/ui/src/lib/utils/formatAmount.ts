import { formatCurrency } from "@workspace/i18n/format";
import type { Locale } from "@workspace/i18n/config";

export function formatAmount(amount: number, currency: string = "USD", locale?: Locale) {
  return formatCurrency(amount, currency, locale);
}
