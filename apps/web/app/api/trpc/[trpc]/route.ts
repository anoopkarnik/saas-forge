import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { resolveTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
export const dynamic = 'force-dynamic';     // ensure no full-route caching
export const revalidate = 0;                // don’t ISR the API itself

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => resolveTRPCContext({ headers: req.headers }),
  });
export { handler as GET, handler as POST };
