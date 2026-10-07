/**
 * API Registry — single source of truth for the Admin → API Management page.
 *
 * Lists every tRPC procedure grouped by router, with its call type
 * (query/mutation) and the role required to access it. Access is determined
 * structurally by which procedure builder each call was declared with in
 * `trpc/init.ts`:
 *
 *   baseProcedure               -> "public"         (anyone, incl. unauthenticated)
 *   protectedProcedure          -> "authenticated"  (user + admin; guest read-only)
 *   adminProcedure              -> "admin"          (admin only)
 *   guestReadableAdminProcedure -> "adminGuestRead" (admin full; guest may read)
 *
 * Guest behaviour (read-only demo account):
 *   - queries: allowed for public, authenticated, and adminGuestRead calls;
 *     blocked for admin-only queries.
 *   - mutations: blocked for authenticated & admin calls; public mutations are
 *     not gated, so guests can call them.
 *
 * This file is plain data (no server-only imports) so it is safe to import from
 * a client component. `trpc/routers/__tests__/apiRegistry.test.ts` verifies that
 * every path and its type stays in sync with the live `appRouter`. Access
 * (which builder each call uses) is hand-maintained — the router does not expose
 * it at runtime.
 */

import { ORGANIZATION_API_GROUPS } from "./apiRegistry.organization";

export type Access = "public" | "authenticated" | "admin" | "adminGuestRead";

export type ApiCall = {
  name: string;
  type: "query" | "mutation";
  access: Access;
};

export type ApiGroup = {
  /** tRPC router path prefix, e.g. "billing" or "admin.settings". */
  group: string;
  /** Human-readable heading. */
  label: string;
  calls: ApiCall[];
};

export const API_REGISTRY: ApiGroup[] = [
  {
    group: "support",
    label: "Support",
    calls: [
      { name: "sendSupportMessage", type: "mutation", access: "public" },
      { name: "subscribeToNewsletter", type: "mutation", access: "public" },
      { name: "chatWithSaaSAssistant", type: "mutation", access: "public" },
    ],
  },
  {
    group: "landing",
    label: "Landing",
    calls: [
      { name: "getLandingInfoFromNotion", type: "query", access: "public" },
      { name: "updateLandingInfo", type: "mutation", access: "admin" },
    ],
  },
  {
    group: "documentation",
    label: "Documentation",
    calls: [
      { name: "getDocumentationInfoFromNotion", type: "query", access: "public" },
      { name: "queryDocumentationBySlug", type: "query", access: "public" },
      { name: "listAdminDocs", type: "query", access: "adminGuestRead" },
      { name: "getAdminDocById", type: "query", access: "adminGuestRead" },
      { name: "createDoc", type: "mutation", access: "admin" },
      { name: "updateDoc", type: "mutation", access: "admin" },
      { name: "deleteDoc", type: "mutation", access: "admin" },
    ],
  },
  {
    group: "home",
    label: "Home",
    calls: [
      { name: "setPassword", type: "mutation", access: "authenticated" },
    ],
  },
  // scaffold:begin billing
  {
    group: "billing",
    label: "Billing",
    calls: [
      { name: "createNewCustomer", type: "mutation", access: "authenticated" },
      { name: "createCheckoutSession", type: "mutation", access: "authenticated" },
      { name: "getTransactions", type: "query", access: "authenticated" },
      { name: "getCreditsBalance", type: "query", access: "authenticated" },
    ],
  },
  // scaffold:end billing
  {
    group: "seo",
    label: "SEO",
    calls: [
      { name: "runAudit", type: "mutation", access: "admin" },
      { name: "getTrafficOverview", type: "query", access: "adminGuestRead" },
      { name: "getTopPages", type: "query", access: "adminGuestRead" },
      { name: "getTrafficSources", type: "query", access: "adminGuestRead" },
      { name: "getDeviceBreakdown", type: "query", access: "adminGuestRead" },
      { name: "getBrowserBreakdown", type: "query", access: "adminGuestRead" },
      { name: "getTopCountries", type: "query", access: "adminGuestRead" },
      { name: "getRealtimeUsers", type: "query", access: "adminGuestRead" },
    ],
  },
  // scaffold:begin ai
  {
    group: "ai",
    label: "AI",
    calls: [
      { name: "getStatus", type: "query", access: "authenticated" },
      { name: "getPrompts", type: "query", access: "admin" },
      { name: "getPromptVersions", type: "query", access: "admin" },
      { name: "createPromptVersion", type: "mutation", access: "admin" },
      { name: "updatePromptVersion", type: "mutation", access: "admin" },
      { name: "deletePromptVersion", type: "mutation", access: "admin" },
      { name: "generateAdminDraft", type: "mutation", access: "admin" },
      { name: "getAvailableModels", type: "query", access: "adminGuestRead" },
      { name: "getWebhookConfig", type: "query", access: "adminGuestRead" },
      { name: "getSpeechConfigs", type: "query", access: "adminGuestRead" },
      { name: "saveSpeechConfig", type: "mutation", access: "admin" },
      { name: "activatePromptVersion", type: "mutation", access: "admin" },
      { name: "getUsageEvents", type: "query", access: "admin" },
    ],
  },
  // scaffold:begin ai_agents
  {
    group: "aiJobs",
    label: "AI Jobs",
    calls: [
      { name: "create", type: "mutation", access: "authenticated" },
      { name: "status", type: "query", access: "authenticated" },
      { name: "events", type: "query", access: "authenticated" },
      { name: "cancel", type: "mutation", access: "authenticated" },
    ],
  },
  // scaffold:end ai_agents
  // scaffold:end ai
  // scaffold:begin api_keys
  {
    group: "apiKey",
    label: "API Keys",
    calls: [
      { name: "list", type: "query", access: "authenticated" },
      { name: "create", type: "mutation", access: "authenticated" },
      { name: "revoke", type: "mutation", access: "authenticated" },
    ],
  },
  // scaffold:end api_keys
  // scaffold:begin notifications
  {
    group: "notification",
    label: "Notifications",
    calls: [
      { name: "list", type: "query", access: "authenticated" },
      { name: "unreadCount", type: "query", access: "authenticated" },
      { name: "markRead", type: "mutation", access: "authenticated" },
      { name: "markAllRead", type: "mutation", access: "authenticated" },
    ],
  },
  {
    group: "notification.preferences",
    label: "Notifications · Preferences",
    calls: [
      { name: "get", type: "query", access: "authenticated" },
      { name: "set", type: "mutation", access: "authenticated" },
    ],
  },
  // scaffold:end notifications
  // scaffold:begin audit_log
  {
    group: "audit",
    label: "Audit log",
    calls: [
      { name: "list", type: "query", access: "admin" },
      { name: "exportCsv", type: "query", access: "admin" },
      // scaffold:begin multi_tenancy
      { name: "orgActivity", type: "query", access: "authenticated" },
      // scaffold:end multi_tenancy
    ],
  },
  // scaffold:end audit_log
  // scaffold:begin webhooks
  {
    group: "webhook",
    label: "Webhooks",
    calls: [
      { name: "eventTypes", type: "query", access: "authenticated" },
      { name: "list", type: "query", access: "authenticated" },
      { name: "create", type: "mutation", access: "authenticated" },
      { name: "update", type: "mutation", access: "authenticated" },
      { name: "delete", type: "mutation", access: "authenticated" },
      { name: "rotateSecret", type: "mutation", access: "authenticated" },
      { name: "sendTest", type: "mutation", access: "authenticated" },
      { name: "deliveries", type: "query", access: "authenticated" },
      { name: "replay", type: "mutation", access: "authenticated" },
    ],
  },
  // scaffold:end webhooks
  // scaffold:begin jobs
  {
    group: "jobs",
    label: "Background jobs",
    calls: [
      { name: "failed", type: "query", access: "admin" },
      { name: "replay", type: "mutation", access: "admin" },
      { name: "discard", type: "mutation", access: "admin" },
      { name: "schedules", type: "query", access: "admin" },
    ],
  },
  // scaffold:end jobs
  ...ORGANIZATION_API_GROUPS,
  {
    group: "siteConfig",
    label: "Site config",
    calls: [
      { name: "get", type: "query", access: "public" },
      { name: "entries", type: "query", access: "adminGuestRead" },
      { name: "update", type: "mutation", access: "admin" },
    ],
  },
  {
    group: "admin.invites",
    label: "Admin · Invites",
    calls: [
      { name: "list", type: "query", access: "admin" },
      { name: "create", type: "mutation", access: "admin" },
      { name: "revoke", type: "mutation", access: "admin" },
      { name: "resend", type: "mutation", access: "admin" },
      { name: "validate", type: "query", access: "public" },
    ],
  },
];
