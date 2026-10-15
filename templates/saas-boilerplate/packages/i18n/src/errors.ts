const reported = new Set<string>();

/**
 * use-intl error handler. Tests fail on any i18n error; elsewhere each
 * distinct error is logged once (the English fallback still renders).
 */
export function onIntlError(error: Error): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") throw error;
  if (reported.has(error.message)) return;
  reported.add(error.message);
  console.error(error);
}
