import { join, normalize, sep } from "path";

// The packaged renderer is served from app://saas-forge instead of file:// so
// its requests carry a real Origin the web API can allow-list. Must match
// DESKTOP_APP_ORIGIN in @workspace/auth/better-auth/desktop-origin.
export const RENDERER_SCHEME = "app";
export const RENDERER_HOST = "saas-forge";
export const RENDERER_ORIGIN = `${RENDERER_SCHEME}://${RENDERER_HOST}`;

// standard: real origin + relative URL resolution; secure: secure context.
export const rendererSchemePrivileges = {
  standard: true,
  secure: true,
  supportFetchAPI: true,
  corsEnabled: true,
} as const;

export function rendererPageUrl(hash?: string): string {
  return `${RENDERER_ORIGIN}/index.html${hash ? `#${hash}` : ""}`;
}

/**
 * Maps an app:// request URL to a file inside rendererDir, or null when it
 * targets another host or escapes the directory.
 */
export function resolveRendererFile(
  rendererDir: string,
  requestUrl: string,
): string | null {
  let pathname: string;
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== `${RENDERER_SCHEME}:` || url.host !== RENDERER_HOST) {
      return null;
    }
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const root = normalize(rendererDir);
  const file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
  return file.startsWith(root + sep) ? file : null;
}
