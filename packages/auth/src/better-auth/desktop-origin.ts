/**
 * Origin of the packaged Electron renderer, which is served from a custom
 * app:// scheme (apps/desktop/src/main/rendererProtocol.ts) rather than
 * file://. Web CORS and Better Auth trust this exact origin instead of
 * "null", which any sandboxed iframe on any site can also send.
 *
 * Keep in sync with RENDERER_ORIGIN in the desktop app (a desktop test
 * asserts they match).
 */
export const DESKTOP_APP_ORIGIN = "app://saas-forge";
