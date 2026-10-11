import { signedFetch } from "@workspace/observability/signed-fetch";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_HMAC_SECRET = process.env.BACKEND_HMAC_SECRET ?? "";

if (!BACKEND_HMAC_SECRET) {
  console.warn("[backend/client] BACKEND_HMAC_SECRET is not set");
}

export type BackendIngestionInput = {
  jobId: string;
  userId: string;
  orgId: string | null;
  input: Record<string, unknown>;
  signal?: AbortSignal;
};

export class BackendHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function runBackendIngestion(input: BackendIngestionInput): Promise<Record<string, unknown>> {
  const resp = await signedFetch({
    url: `${BACKEND_URL}/rag/ingest`,
    secret: BACKEND_HMAC_SECRET,
    payload: {
      job_id: input.jobId,
      user_id: input.userId,
      org_id: input.orgId,
      input: input.input,
    },
    signal: input.signal,
  });
  if (!resp.ok) {
    throw new BackendHttpError(resp.status, `AI ingestion failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json();
}

export type AgentStreamInput = {
  userId: string;
  orgId: string | null;
  agentId: string;
  input: Record<string, unknown>;
  jobId?: string;
  signal?: AbortSignal;
};

export async function openAgentStream(input: AgentStreamInput): Promise<Response> {
  return signedFetch({
    url: `${BACKEND_URL}/agents/stream`,
    secret: BACKEND_HMAC_SECRET,
    payload: {
      user_id: input.userId,
      org_id: input.orgId,
      agent_id: input.agentId,
      input: input.input,
      ...(input.jobId ? { job_id: input.jobId } : {}),
    },
    signal: input.signal,
  });
}
