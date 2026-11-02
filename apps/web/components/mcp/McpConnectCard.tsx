"use client";

import { useEffect, useState } from "react";
import { McpConnectCard as McpConnectCardView } from "@workspace/ui/components/mcp/McpConnectCard";
import { useSiteConfig } from "@/components/site-config/SiteConfigProvider";

export { mcpServerAlias } from "@workspace/ui/components/mcp/McpConnectCard";

/** The web host supplies its origin; native clients must supply their remote server origin. */
export function McpConnectCard() {
  const appName = useSiteConfig()["branding.saasName"];
  const [origin, setOrigin] = useState("https://your-app.example.com");
  useEffect(() => setOrigin(window.location.origin), []);
  return <McpConnectCardView appName={appName} serverOrigin={origin} />;
}
