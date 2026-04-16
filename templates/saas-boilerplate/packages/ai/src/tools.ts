import { tool } from "ai";
import { z } from "zod";

export const starterAssistantTools = {
  getCreditPolicy: tool({
    description: "Return the active AI credit metering policy.",
    inputSchema: z.object({}),
    execute: async () => ({
      unit: "tokens",
      creditsPerThousandTokens: 1,
      minimumCreditsPerCompletedRequest: 1,
    }),
  }),
};
