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
import type { ApiGroup } from "./apiRegistry.types";

export type { Access, ApiCall, ApiGroup } from "./apiRegistry.types";

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
      { name: "getLandingInfo", type: "query", access: "public" },
      { name: "updateLandingInfo", type: "mutation", access: "admin" },
    ],
  },
  {
    group: "documentation",
    label: "Documentation",
    calls: [
      { name: "getDocumentationInfo", type: "query", access: "public" },
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
      { name: "betaWidgets", type: "query", access: "authenticated" },
    ],
  },
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
  {
    group: "apiKey",
    label: "API Keys",
    calls: [
      { name: "list", type: "query", access: "authenticated" },
      { name: "create", type: "mutation", access: "authenticated" },
      { name: "revoke", type: "mutation", access: "authenticated" },
    ],
  },
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
  {
    group: "project",
    label: "Projects",
    calls: [
      { name: "list", type: "query", access: "authenticated" },
      { name: "get", type: "query", access: "authenticated" },
      { name: "save", type: "mutation", access: "authenticated" },
      { name: "update", type: "mutation", access: "authenticated" },
      { name: "duplicate", type: "mutation", access: "authenticated" },
      { name: "delete", type: "mutation", access: "authenticated" },
      { name: "estimateDownload", type: "query", access: "authenticated" },
      { name: "estimateUpgrade", type: "query", access: "authenticated" },
      { name: "setupGuide", type: "query", access: "authenticated" },
      { name: "releases", type: "query", access: "authenticated" },
      { name: "upgradePreview", type: "query", access: "authenticated" },
      { name: "releaseEmails", type: "query", access: "authenticated" },
      { name: "setReleaseEmails", type: "mutation", access: "authenticated" },
      { name: "releaseEmailStatus", type: "query", access: "admin" },
      { name: "sendReleaseEmails", type: "mutation", access: "admin" },
    ],
  },
  {
    group: "scaffold",
    label: "Scaffold catalog",
    calls: [
      { name: "catalog", type: "query", access: "public" },
      { name: "quote", type: "query", access: "public" },
      { name: "downloads", type: "query", access: "authenticated" },
      { name: "previewIndex", type: "query", access: "public" },
      { name: "previewBuild", type: "query", access: "authenticated" },
      { name: "previewSnippet", type: "query", access: "authenticated" },
      { name: "prewarm", type: "mutation", access: "admin" },
    ],
  },
  ...ORGANIZATION_API_GROUPS,
  {
    group: "audit",
    label: "Audit log",
    calls: [
      { name: "list", type: "query", access: "admin" },
      { name: "exportCsv", type: "query", access: "admin" },
      { name: "orgActivity", type: "query", access: "authenticated" },
    ],
  },
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
  {
    group: "usage",
    label: "Usage",
    calls: [
      { name: "summary", type: "query", access: "authenticated" },
      { name: "daily", type: "query", access: "authenticated" },
      { name: "events", type: "query", access: "authenticated" },
      { name: "ledger", type: "query", access: "authenticated" },
      { name: "meters", type: "query", access: "authenticated" },
    ],
  },
  {
    group: "flags",
    label: "Feature flags",
    calls: [
      { name: "forSession", type: "query", access: "authenticated" },
      { name: "list", type: "query", access: "adminGuestRead" },
      { name: "history", type: "query", access: "adminGuestRead" },
      { name: "update", type: "mutation", access: "admin" },
      { name: "preview", type: "query", access: "admin" },
    ],
  },
  {
    group: "onboarding",
    label: "Onboarding",
    calls: [
      { name: "state", type: "query", access: "authenticated" },
      { name: "answer", type: "mutation", access: "authenticated" },
      { name: "setWizard", type: "mutation", access: "authenticated" },
      { name: "dismiss", type: "mutation", access: "authenticated" },
      { name: "complete", type: "mutation", access: "authenticated" },
    ],
  },
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
