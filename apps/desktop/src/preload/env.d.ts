/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface Window {
  api: {
    onDeepLink: (callback: (url: string) => void) => void
  }
}

interface ImportMetaEnv {
  readonly VITE_API_MODE: 'online' | 'offline'
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
