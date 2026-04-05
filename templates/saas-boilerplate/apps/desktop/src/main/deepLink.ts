export const DESKTOP_DEEP_LINK_SCHEME = "saas-forge";
export const DESKTOP_DEEP_LINK_PREFIX = `${DESKTOP_DEEP_LINK_SCHEME}://`;
export const DESKTOP_AUTH_CALLBACK_ROUTE = "/auth-callback";

export const findDesktopDeepLink = (argv: string[]): string | undefined => {
  return argv.find((arg) => arg.startsWith(DESKTOP_DEEP_LINK_PREFIX));
};
