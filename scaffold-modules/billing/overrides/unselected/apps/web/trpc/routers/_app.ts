import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { seoRouter } from './seoProcedures';
import { aiRouter } from './aiProcedures';
import { organizationRouter } from './organizationProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    seo: seoRouter,
    ai: aiRouter,
    organization: organizationRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
