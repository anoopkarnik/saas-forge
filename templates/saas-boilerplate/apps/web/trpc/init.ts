
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import { headers } from 'next/headers';
import { auth, type Session } from '@workspace/auth/better-auth/auth';

type RequestHeaders = Awaited<ReturnType<typeof headers>> | Headers;

export type TRPCContext = {
  headers: RequestHeaders;
  session: Session | null;
};

type CreateTRPCContextOptions = Partial<TRPCContext>;

export const resolveTRPCContext = async (
  opts: CreateTRPCContextOptions = {},
): Promise<TRPCContext> => {
  const requestHeaders = opts.headers ?? await headers();
  const session =
    opts.session !== undefined
      ? opts.session
      : await auth.api.getSession({ headers: requestHeaders });

  return {
    headers: requestHeaders,
    session,
  };
};

export const createTRPCContext = cache(
  async (opts: CreateTRPCContextOptions = {}): Promise<TRPCContext> => {
    return resolveTRPCContext(opts);
  },
);
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<TRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ctx,next})=>{
  if(!ctx.session){
    throw new TRPCError({code:'UNAUTHORIZED',message:'You must be logged in to access this resource.'})
  }
  return next({
    ctx:{
      ...ctx,
      session: ctx.session
    }
  })
})
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access is required to access this resource.',
    });
  }

  return next();
})
