import db from "@workspace/database/client";
import {
  mergeSpeechConfig,
  type SpeechCapability,
  type SpeechConfig,
} from "@workspace/ai/speech";

export async function getPersistedSpeechConfig(
  capability: SpeechCapability,
): Promise<SpeechConfig> {
  const speechConfigDb = db as typeof db & {
    aiSpeechConfig: {
      findUnique(args: {
        where: { capability: SpeechCapability };
      }): Promise<unknown>;
    };
  };
  const record = await speechConfigDb.aiSpeechConfig.findUnique({
    where: { capability },
  });

  return mergeSpeechConfig(record, capability);
}

export function jsonSpeechError(
  message: string,
  status: number,
  details?: unknown,
) {
  return Response.json(
    details ? { error: message, details } : { error: message },
    { status },
  );
}

export { readProviderResponse, extractSpeechText } from "@workspace/ai/speech";
