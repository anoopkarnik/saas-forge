"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicSiteConfig } from "@/lib/site-config/registry";

const SiteConfigContext = createContext<PublicSiteConfig | null>(null);

/** The root layout passes the server-resolved config, so the first paint already uses it. */
export function SiteConfigProvider({ config, children }: { config: PublicSiteConfig; children: ReactNode }) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

/** Runtime site settings (DB -> env -> default). Admin saves refresh it via `router.refresh()`. */
export function useSiteConfig(): PublicSiteConfig {
  const config = useContext(SiteConfigContext);
  if (!config) throw new Error("useSiteConfig() must be used inside <SiteConfigProvider>.");
  return config;
}
