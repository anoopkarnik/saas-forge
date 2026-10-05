import { createHash, randomUUID } from "node:crypto";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function failure(res) {
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.code ?? `http_${res.status}`;
  const message = body?.error?.message ?? body?.error ?? res.statusText;
  return new ApiError(res.status, code, typeof message === "string" ? message : JSON.stringify(message));
}

/** Minimal client for the SaaS Forge v1 API (API-key authenticated). */
export function createClient({ baseUrl, apiKey, fetchImpl = globalThis.fetch }) {
  const call = async (method, path, { body, headers } = {}) => {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await failure(res);
    return res;
  };
  const json = async (method, path, options) => (await call(method, path, options)).json();

  /** Fetches a ZIP and checks it against the server's X-Content-SHA256, when sent. */
  const zip = async (path, body) => {
    const res = await call("POST", path, { body, headers: { "Idempotency-Key": randomUUID() } });
    const bytes = Buffer.from(await res.arrayBuffer());
    const expected = res.headers.get("X-Content-SHA256");
    if (expected && createHash("sha256").update(bytes).digest("hex") !== expected) {
      throw new ApiError(0, "checksum_mismatch", "The download was corrupted in transit. Run the command again.");
    }
    return { bytes, charged: Number(res.headers.get("X-Credits-Charged") ?? 0) };
  };

  return {
    me: () => json("GET", "/api/v1/me"),
    credits: () => json("GET", "/api/v1/credits"),
    pricing: () => json("GET", "/api/v1/scaffold/pricing"),
    getProject: (slug) => json("GET", `/api/v1/projects/${encodeURIComponent(slug)}`),
    createProject: (input) => json("POST", "/api/v1/projects", { body: input }),
    download: (slug, expectedTotalCredits) =>
      zip(`/api/v1/projects/${encodeURIComponent(slug)}/download`, { expectedTotalCredits }),
    upgrade: (slug, input) => zip(`/api/v1/projects/${encodeURIComponent(slug)}/upgrade`, input),
    upgradePreview: (slug, { modules, tierId, providers = {} }) => {
      const query = new URLSearchParams({ modules: modules.join(","), tierId });
      const switches = Object.entries(providers).map(([toggle, value]) => `${toggle}:${value}`);
      if (switches.length) query.set("providers", switches.join(","));
      return json("GET", `/api/v1/projects/${encodeURIComponent(slug)}/upgrade?${query}`);
    },
  };
}
