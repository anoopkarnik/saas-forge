import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { billingRouter } from './billingProcedures';
import { usageRouter } from './usageProcedures';
import { seoRouter } from './seoProcedures';
import { siteConfigRouter } from './siteConfigProcedures';
import { aiRouter } from './aiProcedures';
import { aiJobsRouter } from './aiJobsProcedures';
import { apiKeyRouter } from './apiKeyProcedures';
import { jobsRouter } from './jobsProcedures';
import { notificationRouter } from './notificationProcedures';
import { auditRouter } from './auditProcedures';
import { webhookRouter } from './webhookProcedures';
import { flagsRouter } from './flagsProcedures';
import { onboardingRouter } from './onboardingProcedures';
import { adminRouter } from './adminProcedures';
import { organizationRouter } from './organizationProcedures';
import { projectRouter } from './projectProcedures';
import { scaffoldCatalogRouter } from './scaffoldCatalogProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    billing: billingRouter,
    usage: usageRouter,
    seo: seoRouter,
    siteConfig: siteConfigRouter,
    ai: aiRouter,
    aiJobs: aiJobsRouter,
    apiKey: apiKeyRouter,
    jobs: jobsRouter,
    notification: notificationRouter,
    audit: auditRouter,
    webhook: webhookRouter,
    flags: flagsRouter,
    onboarding: onboardingRouter,
    admin: adminRouter,
    organization: organizationRouter,
    project: projectRouter,
    scaffold: scaffoldCatalogRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
