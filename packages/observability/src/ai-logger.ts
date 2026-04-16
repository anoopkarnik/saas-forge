import { logger } from "./winston-logger";

export type AIObservabilityEvent = {
  userId?: string | null;
  promptKey?: string | null;
  promptVersionId?: string | null;
  provider?: string | null;
  model?: string | null;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  creditsCharged?: number;
  latencyMs?: number;
  status: "started" | "success" | "failed";
  errorCode?: string | null;
  errorMessage?: string | null;
};

export function logAIEvent(event: AIObservabilityEvent) {
  const safeEvent = {
    feature: "ai",
    ...event,
  };

  if (event.status === "failed") {
    logger.error(`AI request failed ${JSON.stringify(safeEvent)}`);
    return;
  }

  logger.info(`AI request ${event.status} ${JSON.stringify(safeEvent)}`);
}
