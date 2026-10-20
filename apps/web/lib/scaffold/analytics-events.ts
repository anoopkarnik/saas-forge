import type { WizardEvent } from "@workspace/ui/blocks/dashboard/DashboardPage";

/**
 * The downloader funnel: SaaS Forge's own events, added to the starter's typed
 * event map here so they never ship in the template (lib/scaffold is root-only).
 * Registry and dashboard: docs/analytics/.
 */
type WizardEvents = { [E in WizardEvent as E["name"]]: E["properties"] };

declare module "@workspace/analytics/events" {
  interface AnalyticsEvents extends WizardEvents {
    "wizard.opened": { modulesAvailable: number };
    "wizard.preview_opened": { view: "folder" | "exact" };
    "wizard.project_saved": { modules: string[]; platforms: string[] };
    /** `source` is "web" for the site and "api" for the CLI and other API-key clients. */
    "scaffold.download_started": { source: string; modules: string[]; platforms: string[]; free: boolean };
    "scaffold.download_completed": { source: string; modules: string[]; cacheHit: boolean; charged: number };
    "scaffold.download_failed": { source: string; modules: string[]; error: string };
    "upgrade.preview_viewed": { addedModules: string[]; deltaCredits: number };
    "upgrade.purchased": { source: string; addedModules: string[]; tierSteps: number; deltaCredits: number };
    /** An agent asked the MCP server for a price; the purchase itself is tracked with `source: "api"`. */
    "mcp.quote_viewed": { kind: "download" | "upgrade" | "release"; credits: number; modules: string[] };
  }
}
