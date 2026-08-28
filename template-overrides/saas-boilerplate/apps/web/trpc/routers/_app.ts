import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { billingRouter } from './billingProcedures';
import { seoRouter } from './seoProcedures';
import { aiRouter } from './aiProcedures';
import { aiJobsRouter } from './aiJobsProcedures';
import { apiKeyRouter } from './apiKeyProcedures';
import { adminRouter } from './adminProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    billing: billingRouter,
    seo: seoRouter,
    ai: aiRouter,
    aiJobs: aiJobsRouter,
    apiKey: apiKeyRouter,
    admin: adminRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
