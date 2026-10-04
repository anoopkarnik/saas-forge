/**
 * Import-direction rules, enforced in CI via `pnpm arch:check`.
 *
 * Layers (top may import bottom, never the reverse):
 *   apps/web/app, apps/web/trpc/routers   controllers (routes, tRPC procedures)
 *   apps/web/lib                          application services + pure rules
 *   packages/*                            shared libraries (database, auth, ui, ...)
 *
 * UI code (components, hooks, pages, native renderers) reaches data through
 * tRPC or a lib service, never through @workspace/database directly.
 */

const DATABASE = "^packages/database/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular imports couple modules so neither can change alone.",
      from: {},
      to: { circular: true },
    },
    {
      name: "packages-not-to-apps",
      severity: "error",
      comment: "Shared packages must not depend on an app.",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "ui-not-to-database",
      severity: "error",
      comment: "UI layers get data via tRPC or a lib service, not Prisma.",
      from: {
        path: "^(packages/ui|apps/web/components|apps/web/hooks|apps/desktop/src/renderer|apps/mobile)/",
      },
      to: { path: DATABASE },
    },
    {
      name: "pages-not-to-database",
      severity: "error",
      comment: "Next.js pages/layouts load data via tRPC hydration or a lib service.",
      from: {
        path: [
          "^apps/web/app/(page|layout|template|loading|error|not-found)\\.tsx$",
          "^apps/web/app/.*/(page|layout|template|loading|error|not-found)\\.tsx$",
        ],
      },
      to: { path: DATABASE },
    },
    {
      name: "services-not-to-controllers",
      severity: "error",
      comment: "lib/ services must not import route handlers or tRPC routers.",
      from: { path: "^apps/web/lib/" },
      to: { path: "^apps/web/(app|trpc/routers)/" },
    },
    {
      name: "ui-components-not-to-blocks",
      severity: "error",
      comment: "In packages/ui, blocks compose components; components never import blocks.",
      from: { path: "^packages/ui/src/components/" },
      to: { path: "^packages/ui/src/blocks/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "(node_modules|/\\.next/|/out/|/dist/|/coverage/|/generated/|__tests__|\\.test\\.)",
    },
    // Count type-only imports too: a type cycle is still a design cycle.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tooling/depcruise/tsconfig.web.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
  },
};
