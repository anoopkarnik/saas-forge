import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  InvalidScaffoldModuleError,
  calculateScaffoldCredits,
  getScaffoldCatalog,
  validateSelectedModules,
} from "@/lib/scaffold-modules";
import {
  getScaffoldPreviewIndex,
  listDownloads,
  prewarmBuildCache,
  previewScaffoldBuild,
} from "@/lib/scaffold/service";

const selectionInput = z.object({
  modules: z.array(z.string()),
  platforms: z.array(z.enum(["web", "desktop", "mobile"])).min(1),
});

function badRequestOnInvalidModules<T>(run: () => Promise<T>): Promise<T> {
  return run().catch((err) => {
    if (err instanceof InvalidScaffoldModuleError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
    }
    throw err;
  });
}

// The only source of scaffold prices for every client (web, desktop, mobile,
// CLI). Root-only: excluded from the boilerplate with the other scaffold code.
export const scaffoldCatalogRouter = createTRPCRouter({
  catalog: baseProcedure.query(() => getScaffoldCatalog()),

  quote: baseProcedure
    .input(z.object({ modules: z.array(z.string()) }))
    .query(({ input }) => {
      try {
        return calculateScaffoldCredits(validateSelectedModules(input.modules));
      } catch (err) {
        if (err instanceof InvalidScaffoldModuleError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw err;
      }
    }),

  /** The caller's recent downloads; delivered ones re-download free. */
  downloads: protectedProcedure.query(({ ctx }) => listDownloads(ctx.session.user.id)),

  /** Files, models and env vars per module, for instant previews in the wizard. */
  previewIndex: baseProcedure.query(() => getScaffoldPreviewIndex()),

  /** The exact file list of one selection; signed-in only, as a miss builds it. */
  previewBuild: protectedProcedure
    .input(selectionInput)
    .query(({ input }) =>
      badRequestOnInvalidModules(async () => {
        const { files, snippets } = await previewScaffoldBuild(input.modules, input.platforms);
        return { files, snippetPaths: Object.keys(snippets) };
      }),
    ),

  /** One allow-listed file of a selection (README, .env.example, schema). */
  previewSnippet: protectedProcedure
    .input(selectionInput.extend({ path: z.string() }))
    .query(({ input }) =>
      badRequestOnInvalidModules(async () => {
        const { snippets } = await previewScaffoldBuild(input.modules, input.platforms);
        const content = snippets[input.path];
        if (content === undefined) {
          throw new TRPCError({ code: "NOT_FOUND", message: "This file is not available in the preview." });
        }
        return content;
      }),
    ),

  /** Fills the build cache for the most requested selections after a deploy. */
  prewarm: adminProcedure.mutation(() => prewarmBuildCache()),
});
