/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface Window {
  api: {
    onDeepLink: (callback: (url: string) => void) => void
    saveFile: (fileName: string, buffer: ArrayBuffer) => Promise<boolean>
  }
}

interface ImportMetaEnv {
  readonly VITE_API_MODE: 'online' | 'offline'
  readonly VITE_API_URL: string
  readonly VITE_SUPPORT_MAIL?: string
  readonly VITE_CALENDLY_BOOKING_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
