# Workspace package ownership

Selectable scaffold modules own their backend code in packages. Their visual components and blocks stay in the shared UI package. Apps connect those pieces to platform routes, authentication and data fetching.

<!-- scaffold:begin billing -->

- **Billing:** backend in `billing/src` (providers, payments, usage); UI in `ui/src/components/payments` and billing settings under `components/home`.
<!-- scaffold:end billing -->

<!-- scaffold:begin notifications -->

- **Notifications:** backend in `notifications/src`; UI in `ui/src/components/notifications`.
<!-- scaffold:end notifications -->

<!-- scaffold:begin audit_log -->

- **Audit log:** backend in `audit/src`; UI in `ui/src/components/audit`.
<!-- scaffold:end audit_log -->

<!-- scaffold:begin webhooks -->

- **Outgoing webhooks:** backend in `webhooks/src`; UI in `ui/src/components/webhooks` and `ui/src/blocks/webhooks`.
<!-- scaffold:end webhooks -->

<!-- scaffold:begin feature_flags -->

- **Feature flags:** backend in `flags/src` (evaluator, rules, admin services); admin UI stays in the app, and only evaluated values reach clients.
<!-- scaffold:end feature_flags -->

<!-- scaffold:begin onboarding -->

- **Onboarding:** backend in `onboarding/src`; UI in `ui/src/components/onboarding`.
<!-- scaffold:end onboarding -->

<!-- scaffold:begin mcp -->

- **MCP server:** backend in `mcp/src`; UI in `ui/src/components/mcp`.
<!-- scaffold:end mcp -->

<!-- scaffold:begin ai -->

- **AI:** backend in `ai/src` (including speech utilities); UI in `ui/src/components/ai`.
<!-- scaffold:end ai -->

<!-- scaffold:begin ai_agents -->

- **AI agents:** stream parsing in `ai/src/agent-stream.ts`; Python execution stays in `apps/backend`, and agent screens stay in the app.
<!-- scaffold:end ai_agents -->

<!-- scaffold:begin jobs -->

- **Jobs:** backend in `jobs/src`, persistence at `@workspace/jobs/persistence`; admin UI stays in the app.
<!-- scaffold:end jobs -->

<!-- scaffold:begin analytics -->

- **Analytics:** backend in `analytics/src`; consent and provider wiring stay in the app.
<!-- scaffold:end analytics -->

<!-- scaffold:begin api_keys -->

- **API keys:** backend in `auth/src/api-keys`; UI in `ui/src/components/api-keys`.
<!-- scaffold:end api_keys -->

<!-- scaffold:begin multi_tenancy -->

- **Organizations:** backend in `auth/src/better-auth/organization*`; UI in `ui/src/components/organizations`.
<!-- scaffold:end multi_tenancy -->

Database models and generated clients stay in `database`; translated messages stay in `i18n`; email templates and senders stay in `email`.

## App adapters

- HTTP routes and tRPC procedures check authentication, roles, guests, scopes and input before calling services. Moving a service never removes those checks.
- Payment routes verify provider signatures, then call billing's verified-event handlers. The handlers retain transactional duplicate protection and post-commit side effects.
- `apps/web/lib/audit/audit.ts` supplies the request-detail setting to the transaction-scoped audit writer. The Better Auth response interceptor remains in web.
- `apps/web/lib/onboarding/service.ts` supplies runtime wizard/checklist settings. Task definitions and completion checks belong to the module package.
- `apps/web/lib/flags/definitions.ts` owns the application's registry and code defaults. The request adapter supplies that registry and an optional external cache to the package evaluator. The admin adapter adds auditing through a transaction hook.
- `apps/web/lib/mcp/server.ts` composes branding, module tools and the platform-only slot. The starter's platform slot stays empty.
- App UI containers own tRPC/query/session hooks. Shared views receive data and callbacks. An MCP connection card receives the actual backend origin from its host.

## Scaffold rules

The folder layout expresses ownership; `scaffold-modules/<id>/manifest.json` remains the executable removal contract. A module owns its package folder, corresponding app routes/adapters, shared UI folders, database models/migrations, message namespaces and dependency declarations.

Optional integrations use scaffold markers around imports and call sites, and a `jsonRemove` action for every consuming package dependency. Packages never import `apps/*` or the app-local `@/` alias.

<!-- scaffold:begin notifications -->

For example, billing's notification integration and `@workspace/notifications` dependency disappear together when notifications is excluded.

<!-- scaffold:end notifications -->

Provider implementations and SDK dependencies belong to the owning module package and are pruned by the provider manifests. Module removal also removes package-local tests. When a consumer package was explicitly removed earlier, dependency pruning may skip its missing manifest; unexplained missing files and missing keys still fail compilation.

Two app slots remain available without their modules: `lib/usage/record.ts` records credit spend without the billing ledger, and `lib/flags/flags.ts` returns code defaults without the flags engine. Jobs similarly retains its inline core while its persistence and Inngest integration are removed.

After changing ownership, update module/provider manifests, workspace dependencies/lockfile, template overrides and operational documentation. Run template sync/check, package and app tests/typechecks, architecture checks and the scaffold matrix. The matrix verifies generated combinations and frozen installs; a staged starter build checks Next.js integration.
