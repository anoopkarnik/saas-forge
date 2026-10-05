import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { resolveTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

// The same router as /api/trpc, deployed in a function that ships the starter
// source (see outputFileTracingIncludes in next.config.mjs). Procedures that
// hash or compile the template are called here (trpc/scaffold-client.ts), so
// the main tRPC function every page uses stays small.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/scaffold/trpc",
    req,
    router: appRouter,
    createContext: () => resolveTRPCContext({ headers: req.headers }),
  });
export { handler as GET, handler as POST };
