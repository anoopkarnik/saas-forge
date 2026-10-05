import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  InvalidScaffoldModuleError,
  calculateScaffoldCredits,
  getScaffoldCatalog,
  validateSelectedModules,
} from "@/lib/scaffold-modules";

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
});
