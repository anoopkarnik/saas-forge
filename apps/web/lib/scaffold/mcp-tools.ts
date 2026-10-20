import { z } from "zod";
import { track } from "@workspace/analytics/server";
import { McpToolError, defineMcpTool, type McpTool } from "@/lib/mcp/define";
import {
  InvalidScaffoldModuleError,
  calculateScaffoldCredits,
  loadProviderRegistry,
  loadScaffoldRegistry,
  validateSelectedModules,
} from "@/lib/scaffold-modules";
import { createProjectInput, updateProjectInput } from "@/lib/scaffold/project-inputs";
import {
  createProject,
  getProject,
  listProjects,
  markProjectCurrent,
  updateProject,
} from "@/lib/scaffold/project-service";
import { getPublicPricing } from "@/lib/scaffold/public-pricing";
import { compareVersions } from "@/lib/scaffold/release-notes";
import { getProjectReleases, loadReleases } from "@/lib/scaffold/releases";
import {
  computeBuildHash,
  computeUpgradeDelta,
  upgradeProviders,
} from "@/lib/scaffold/service";
import { getTemplateVersion } from "@/lib/scaffold/template-version";

/**
 * SaaS Forge's own MCP tools, served at /api/mcp next to the app tools
 * (lib/mcp/catalog.ts) through the lib/mcp/platform.ts slot. Each wraps the
 * service the matching /api/v1 route uses and needs that route's scope.
 * Nothing here spends credits: purchases go through `create-saas-forge`, whose
 * exact command the quote tools return. Platform-only.
 */

export const platformMcpInstructions = `SaaS Forge sells a SaaS starter as modules (billing, teams, AI, jobs, webhooks, ...). The project tools plan saved projects and price downloads and upgrades. They never spend credits.

- To start a project: get_catalog, create_project with every required module, quote_download, then run the returned command after the user approves the price.
- To add modules to a project the user already downloaded: work inside that project's repository (its .saas-forge.json names the project slug), call quote_upgrade with addModules, show the price, and after approval run its command, then follow its nextSteps. Never use update_project to add modules to a downloaded project.
- To bring a downloaded project up to the latest release: call quote_upgrade with the templateVersion from .saas-forge.json as fromVersion. A project behind gets a free release kit command; run it, then follow its nextSteps. Only when the dry run reports no snapshot for that release, apply the get_release_notes changes by hand and call mark_project_current.
- Always show the credit price and get the user's explicit approval before running any create-saas-forge command. Leave database migrations (pnpm migrate) to the user.`;

const tool = defineMcpTool;

const CLI = "npx create-saas-forge";
const slugInput = z.object({ slug: z.string().trim().min(1).describe("The project's slug.") });

async function requireProject(userId: string, slug: string) {
  const project = await getProject(userId, slug);
  if (!project) throw new McpToolError(`No project with slug "${slug}". Call list_projects to see your projects.`);
  return project;
}

/** Selecting a module also selects what it requires; same rule as the CLI. */
export function withRequirements(modules: readonly string[]): string[] {
  const requires = new Map(loadScaffoldRegistry().modules.map((m) => [m.id as string, m.requires as string[]]));
  const out = new Set<string>();
  const add = [...modules];
  while (add.length > 0) {
    const id = add.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    add.push(...(requires.get(id) ?? []));
  }
  return [...out];
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value) => b.includes(value));

const tools = [
  tool({
    name: "get_catalog",
    title: "Get module catalog",
    description:
      "List every SaaS Forge module with its description, price in credits and the modules it requires, " +
      "plus the provider choices (payment gateway, image storage, CMS) a project can switch between.",
    scope: "read:me",
    readOnly: true,
    input: z.object({}),
    run: async () => ({
      ...getPublicPricing(),
      providers: loadProviderRegistry().providers.map(({ id, label, module, values }) => ({ id, label, module, values })),
    }),
  }),

  tool({
    name: "list_projects",
    title: "List projects",
    description: "List the user's saved SaaS Forge projects with their modules, platforms and last download time.",
    scope: "read:projects",
    readOnly: true,
    input: z.object({}),
    run: async (_input, { userId }) => ({ projects: await listProjects(userId) }),
  }),

  tool({
    name: "get_project",
    title: "Get project",
    description: "Read one saved project: modules, tier, platforms, template version and configuration.",
    scope: "read:projects",
    readOnly: true,
    input: slugInput,
    run: async ({ slug }, { userId }) => ({ project: await requireProject(userId, slug) }),
  }),

  tool({
    name: "create_project",
    title: "Create project",
    description:
      "Save a new project configuration. Free: nothing is downloaded or charged. Every module a selected module " +
      "requires must be listed too (see get_catalog). Secrets in config are dropped and listed in strippedKeys.",
    scope: "write:projects",
    readOnly: false,
    input: createProjectInput,
    run: async (input, { userId }) => {
      const { project, strippedKeys } = await createProject(userId, input);
      return { project, strippedKeys };
    },
  }),

  tool({
    name: "update_project",
    title: "Update project",
    description:
      "Change a saved project's name, platforms, configuration, or (only before its first download) its modules " +
      "and tier. To add modules to a project that was already downloaded, use quote_upgrade instead.",
    scope: "write:projects",
    readOnly: false,
    input: updateProjectInput.extend({ slug: slugInput.shape.slug }),
    run: async ({ slug, ...patch }, { userId }) => {
      const current = await requireProject(userId, slug);
      // A downloaded project's modules and tier record what the buyer owns;
      // changing them here would make the upgrade kit skip the new code.
      if (current.lastBuiltAt) {
        if (patch.modules !== undefined && !sameSet(patch.modules, current.modules)) {
          throw new McpToolError(
            `"${slug}" was already downloaded, so its modules cannot be edited. Call quote_upgrade with addModules to add modules through an upgrade kit.`,
          );
        }
        if (patch.tierId !== undefined && patch.tierId !== current.tierId) {
          throw new McpToolError(
            `"${slug}" was already downloaded, so its tier cannot be edited. Call quote_upgrade with tierId instead.`,
          );
        }
      }
      const project = await updateProject(userId, slug, patch);
      if (!project) throw new McpToolError(`No project with slug "${slug}".`);
      return { project };
    },
  }),

  tool({
    name: "quote_download",
    title: "Quote a download",
    description:
      "Price downloading a saved project and return the create-saas-forge command that downloads it. " +
      "Show the price to the user and get their approval before running the command: it spends credits.",
    scope: "read:projects",
    readOnly: true,
    input: slugInput,
    run: async ({ slug }, { userId }) => {
      const project = await requireProject(userId, slug);
      const modules = validateSelectedModules(project.modules);
      const fullPrice = calculateScaffoldCredits(modules).totalCredits;
      const alreadyOwned = !!project.lastBuiltHash && project.lastBuiltHash === computeBuildHash(project);
      await track(
        "mcp.quote_viewed",
        { kind: "download", credits: alreadyOwned ? 0 : fullPrice, modules },
        { distinctId: userId },
      );
      return {
        slug,
        modules,
        platforms: project.platforms,
        credits: alreadyOwned ? 0 : fullPrice,
        alreadyOwned,
        command: `${CLI} new ${slug} --project ${slug} --yes`,
        notes: [
          "The command needs a SaaS Forge API key with the scaffold:download scope (create-saas-forge login, or SAAS_FORGE_API_KEY).",
          "It creates the folder in the current directory and fails if a non-empty folder with that name exists.",
        ],
      };
    },
  }),

  tool({
    name: "quote_upgrade",
    title: "Quote an upgrade",
    description:
      "Price adding modules, raising the tier or switching providers on a project the user already downloaded. " +
      "Required modules are added automatically. Returns the price, the release notes since the project's version, " +
      "and the create-saas-forge command that buys the upgrade kit. Show the price to the user and get their " +
      "approval before running it: it spends credits. Run the command inside the project's repository.",
    scope: "read:projects",
    readOnly: true,
    input: slugInput.extend({
      addModules: z.array(z.string()).default([]).describe("Module ids to add, from get_catalog."),
      tierId: z
        .string()
        .regex(/^tier-\d+$/, 'Tier ids look like "tier-3".')
        .optional()
        .describe("Target tier, if raising it."),
      providers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Provider switches, e.g. { "payment_gateway": "dodo" }. Switching is free.'),
      fromVersion: z
        .string()
        .regex(/^\d+\.\d+\.\d+$/, 'Versions look like "2.1.0".')
        .optional()
        .describe("templateVersion from the repository's .saas-forge.json: the release its files are on."),
    }),
    run: async ({ slug, addModules, tierId, providers, fromVersion }, { userId }) => {
      const project = await requireProject(userId, slug);
      const fromModules = validateSelectedModules(project.modules);
      const requested = withRequirements([...project.modules, ...addModules]);
      const toModules = validateSelectedModules(requested);
      const toTierId = tierId ?? project.tierId;
      const switches = upgradeProviders(
        (project.config ?? {}) as Record<string, unknown>,
        fromModules,
        toModules,
        providers,
      );
      const delta = computeUpgradeDelta({ fromModules, toModules, fromTierId: project.tierId, toTierId });

      const currentVersion = fromVersion ?? project.templateVersion;
      if (delta.addedModules.length === 0 && delta.tierSteps === 0 && switches.switched.length === 0) {
        const latestVersion = getTemplateVersion();
        if (compareVersions(currentVersion, latestVersion) >= 0) {
          return {
            slug,
            nothingToUpgrade: true,
            templateVersion: currentVersion,
            latestVersion,
            message: "The project already has these modules, tier and providers, and the latest release.",
          };
        }
        // The kit's file counts need the release's snapshot, which only the
        // download function reads: the dry run reports them, or that none exists.
        await track("mcp.quote_viewed", { kind: "release", credits: 0, modules: [] }, { distinctId: userId });
        const args = `upgrade --project ${slug}`;
        return {
          slug,
          nothingToUpgrade: false,
          kind: "release",
          fromVersion: currentVersion,
          latestVersion,
          credits: 0,
          releases: getProjectReleases({ ...project, templateVersion: currentVersion }, loadReleases(), latestVersion),
          command: `${CLI} ${args} --yes`,
          previewCommand: `${CLI} ${args} --dry-run`,
          nextSteps: [
            "Run previewCommand inside the project's repository for the kit's file counts (free).",
            "Run command there: the release kit is free and extracts into .upgrade/ with UPGRADE_SPEC.json, .upgrade-base/ and the latest /upgrade-boilerplate command.",
            "Run the /upgrade-boilerplate command to merge it into the customized code.",
            "If the dry run reports no snapshot for this release, apply the get_release_notes changes by hand instead, then call mark_project_current.",
          ],
        };
      }

      await track(
        "mcp.quote_viewed",
        { kind: "upgrade", credits: delta.deltaCredits, modules: delta.addedModules },
        { distinctId: userId },
      );

      const args = [`upgrade --project ${slug}`];
      if (delta.addedModules.length > 0) args.push(`--add ${delta.addedModules.join(",")}`);
      if (delta.tierSteps > 0) args.push(`--tier ${toTierId}`);
      for (const toggle of switches.switched) args.push(`--provider ${toggle}=${switches.toProviders[toggle]}`);

      return {
        slug,
        addedModules: delta.addedModules,
        requiredByRequested: delta.addedModules.filter((id) => !addModules.includes(id)),
        tierSteps: delta.tierSteps,
        providerSwitches: switches.switched.map((toggle) => ({
          toggle,
          from: switches.fromProviders[toggle],
          to: switches.toProviders[toggle],
        })),
        credits: delta.deltaCredits,
        releases: getProjectReleases({ ...project, templateVersion: currentVersion }, loadReleases(), getTemplateVersion()),
        command: `${CLI} ${args.join(" ")} --yes`,
        previewCommand: `${CLI} ${args.join(" ")} --dry-run`,
        nextSteps: [
          "Run previewCommand for the kit's file counts and new migrations (free).",
          "After the user approves the price, run command inside the project's repository. It needs an API key with the scaffold:upgrade scope and extracts the kit into .upgrade/ with UPGRADE_SPEC.json.",
          "Run the /upgrade-boilerplate command to merge the kit into the customized code.",
          "Ask the user to run pnpm migrate for any new migrations, add the new modules' credentials to .env, and run pnpm doctor --check.",
        ],
      };
    },
  }),

  tool({
    name: "get_release_notes",
    title: "Get release notes",
    description:
      "List the SaaS Forge releases since the project's template version, with only the entries for its modules, " +
      "and any security advisories that concern it.",
    scope: "read:projects",
    readOnly: true,
    input: slugInput,
    run: async ({ slug }, { userId }) => {
      const project = await requireProject(userId, slug);
      return getProjectReleases(project, loadReleases(), getTemplateVersion());
    },
  }),

  tool({
    name: "mark_project_current",
    title: "Mark project up to date",
    description:
      "Record that a downloaded project now has the latest SaaS Forge release, after its get_release_notes changes " +
      "were applied to the repository by hand. Free; it changes no code and no modules. Use it only once the " +
      "changes are applied, since it clears the project's \"behind\" status and release reminders.",
    scope: "write:projects",
    readOnly: false,
    input: slugInput,
    run: async ({ slug }, { userId }) => {
      const result = await markProjectCurrent(userId, slug);
      switch (result.status) {
        case "not_found":
          throw new McpToolError(`No project with slug "${slug}". Call list_projects to see your projects.`);
        case "not_downloaded":
          throw new McpToolError(`"${slug}" was never downloaded; its first download already gets the latest version.`);
        case "current":
          return { slug, alreadyCurrent: true, templateVersion: result.templateVersion, credits: 0 };
        case "marked":
          return {
            slug,
            alreadyCurrent: false,
            fromVersion: result.fromVersion,
            templateVersion: result.templateVersion,
            credits: 0,
            nextSteps: [
              `Set templateVersion to ${result.templateVersion} in the repository's .saas-forge.json and .boilerplate-version.`,
            ],
          };
      }
    },
  }),
];

/** Registry errors (unknown module, missing requirement) are messages the agent can act on. */
export const platformMcpTools: McpTool[] = tools.map((definition) => ({
  ...definition,
  run: async (input, caller) => {
    try {
      return await definition.run(input, caller);
    } catch (err) {
      if (err instanceof InvalidScaffoldModuleError) throw new McpToolError(err.message);
      throw err;
    }
  },
}));
