import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { seoRouter } from './seoProcedures';
import { apiKeyRouter } from './apiKeyProcedures';
import { adminRouter } from './adminProcedures';
// scaffold:begin billing
import { billingRouter } from './billingProcedures';
// scaffold:end billing
// scaffold:begin ai
import { aiRouter } from './aiProcedures';
import { aiJobsRouter } from './aiJobsProcedures';
// scaffold:end ai
// scaffold:begin multi_tenancy
import { organizationRouter } from './organizationProcedures';
// scaffold:end multi_tenancy

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    seo: seoRouter,
    apiKey: apiKeyRouter,
    admin: adminRouter,
    // scaffold:begin billing
    billing: billingRouter,
    // scaffold:end billing
    // scaffold:begin ai
    ai: aiRouter,
    aiJobs: aiJobsRouter,
    // scaffold:end ai
    // scaffold:begin multi_tenancy
    organization: organizationRouter,
    // scaffold:end multi_tenancy
});
// export type definition of API
export type AppRouter = typeof appRouter;
