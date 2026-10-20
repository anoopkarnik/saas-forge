import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { seoRouter } from './seoProcedures';
import { siteConfigRouter } from './siteConfigProcedures';
import { apiKeyRouter } from './apiKeyProcedures';
import { jobsRouter } from './jobsProcedures';
import { notificationRouter } from './notificationProcedures';
import { auditRouter } from './auditProcedures';
import { webhookRouter } from './webhookProcedures';
import { flagsRouter } from './flagsProcedures';
import { onboardingRouter } from './onboardingProcedures';
import { adminRouter } from './adminProcedures';
import { billingRouter } from './billingProcedures';
import { usageRouter } from './usageProcedures';
import { aiRouter } from './aiProcedures';
import { aiJobsRouter } from './aiJobsProcedures';
import { organizationRouter } from './organizationProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    seo: seoRouter,
    siteConfig: siteConfigRouter,
    apiKey: apiKeyRouter,
    jobs: jobsRouter,
    notification: notificationRouter,
    audit: auditRouter,
    webhook: webhookRouter,
    flags: flagsRouter,
    onboarding: onboardingRouter,
    admin: adminRouter,
    billing: billingRouter,
    usage: usageRouter,
    ai: aiRouter,
    aiJobs: aiJobsRouter,
    organization: organizationRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
