import { signedFetch } from "@workspace/observability/signed-fetch";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_HMAC_SECRET = process.env.BACKEND_HMAC_SECRET ?? "";

if (!BACKEND_HMAC_SECRET) {
  console.warn("[backend/client] BACKEND_HMAC_SECRET is not set");
}

export type EnqueueJobInput = {
  jobId: string;
  userId: string;
  orgId: string | null;
  agentId: string;
  input: Record<string, unknown>;
};

export async function enqueueJob(input: EnqueueJobInput): Promise<void> {
  const resp = await signedFetch({
    url: `${BACKEND_URL}/jobs`,
    secret: BACKEND_HMAC_SECRET,
    payload: {
      job_id: input.jobId,
      user_id: input.userId,
      org_id: input.orgId,
      agent_id: input.agentId,
      input: input.input,
    },
  });
  if (!resp.ok) {
    throw new Error(`enqueue failed: ${resp.status} ${await resp.text()}`);
  }
}

export type AgentStreamInput = {
  userId: string;
  orgId: string | null;
  agentId: string;
  input: Record<string, unknown>;
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
    },
    signal: input.signal,
  });
}
