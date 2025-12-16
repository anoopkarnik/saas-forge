import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter
});
// export type definition of API
export type AppRouter = typeof appRouter;