import { createHmac, randomUUID } from "node:crypto";

export type SignedFetchInput = {
  url: string;
  secret: string;
  payload: Record<string, unknown>;
  method?: "POST" | "PUT" | "DELETE";
  requestId?: string;
  signal?: AbortSignal;
  /** Override timestamp (seconds since epoch). For tests only. */
  timestamp?: number;
};

export function canonicalBody(payload: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(payload));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function sign(
  secret: string,
  timestamp: number,
  body: string,
): string {
  return createHmac("sha256", secret).update(`${timestamp}\n${body}`).digest("hex");
}

export async function signedFetch(input: SignedFetchInput): Promise<Response> {
  const ts = input.timestamp ?? Math.floor(Date.now() / 1000);
  const body = canonicalBody(input.payload);
  const sig = sign(input.secret, ts, body);
  const reqId = input.requestId ?? randomUUID();

  return fetch(input.url, {
    method: input.method ?? "POST",
    body,
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      "X-Saas-Forge-Ts": String(ts),
      "X-Saas-Forge-Sig": sig,
      "X-Saas-Forge-Req-Id": reqId,
    },
  });
}
