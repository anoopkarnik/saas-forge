import { serve } from "inngest/next";
import { inngest } from "@workspace/jobs/inngest";
import { jobFunctions } from "@/lib/jobs/functions";

// Inngest calls this endpoint to run jobs and cron schedules. The SDK verifies
// each request with INNGEST_SIGNING_KEY (skipped when INNGEST_DEV is set).
export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({ client: inngest, functions: jobFunctions() });
