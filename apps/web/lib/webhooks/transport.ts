import http from "node:http";
import https from "node:https";
import { guardedLookup } from "@/lib/webhooks/ssrf";

export const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

/**
 * POSTs one delivery. No redirects are followed, the connection goes only to
 * a public address, and the response body is read up to 64 KB and dropped.
 */
export function postWebhook(url: URL, body: string, headers: Record<string, string>): Promise<{ status: number }> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        method: "POST",
        headers: { ...headers, "content-length": Buffer.byteLength(body).toString() },
        lookup: guardedLookup as never,
        timeout: DELIVERY_TIMEOUT_MS,
      },
      (response) => {
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) response.destroy();
        });
        response.on("close", () => resolve({ status: response.statusCode ?? 0 }));
        response.on("error", () => resolve({ status: response.statusCode ?? 0 }));
      },
    );
    request.on("timeout", () => request.destroy(new Error(`Timed out after ${DELIVERY_TIMEOUT_MS / 1000}s`)));
    request.on("error", reject);
    request.end(body);
  });
}
