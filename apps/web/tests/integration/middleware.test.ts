import { afterEach, describe, expect, it, vi } from "vitest";

const createRequest = (
  path: string,
  cookieHeader?: string,
  baseUrl = "http://localhost:3000",
  init: { method?: string; headers?: Record<string, string> } = {},
) => {
  const cookieMap = new Map(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split("=");
        return [name, rest.join("=")];
      }),
  );

  return {
    method: init.method ?? "GET",
    headers: new Headers(init.headers),
    nextUrl: new URL(`${baseUrl}${path}`),
    cookies: {
      get: (name: string) => {
        const value = cookieMap.get(name);
        return value ? { value } : undefined;
      },
    },
  };
};

describe("middleware auth cookie isolation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores another localhost app's default Better Auth cookie", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "SaaS Forge");

    const { default: middleware } = await import("../../middleware");

    const response = await middleware(
      createRequest("/", "better-auth.session_token=foreign-session") as any,
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/landing",
    );
  });

  it("accepts this app's derived auth cookie prefix", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "SaaS Forge");

    const { default: middleware } = await import("../../middleware");

    const response = await middleware(
      createRequest("/", "saas-forge.session_token=local-session") as any,
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("normalizes NEXT_PUBLIC_SAAS_NAME into a cookie-safe prefix", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "Forge Dev App");

    const { default: middleware } = await import("../../middleware");

    const response = await middleware(
      createRequest("/", "forge-dev-app.session_token=local-session") as any,
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});

describe("middleware route trust contract", () => {
  const load = async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "SaaS Forge");
    return (await import("../../middleware")).default;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not treat look-alike prefixes of public routes as public", async () => {
    const middleware = await load();

    const response = await middleware(createRequest("/publicity") as any);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/landing",
    );
  });

  it("lets anonymous callers reach the healthcheck", async () => {
    const middleware = await load();

    const response = await middleware(createRequest("/api/healthcheck") as any);

    expect(response.headers.get("location")).toBeNull();
  });

  it("lets API-key routes through without a session cookie", async () => {
    const middleware = await load();

    const response = await middleware(createRequest("/api/v1/me") as any);

    expect(response.headers.get("location")).toBeNull();
  });

  it("leaves session API routes to answer 401 themselves instead of redirecting", async () => {
    const middleware = await load();

    const response = await middleware(
      createRequest("/api/ai/chat", undefined, "http://localhost:3000", {
        method: "POST",
      }) as any,
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["null", "file://"])(
    "never grants credentialed CORS to the %s origin",
    async (origin) => {
      const middleware = await load();

      const response = await middleware(
        createRequest("/api/trpc/x", undefined, "http://localhost:3000", {
          headers: { origin },
        }) as any,
      );

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    },
  );

  it("grants credentialed CORS to the packaged desktop app's origin", async () => {
    const middleware = await load();

    const response = await middleware(
      createRequest("/api/trpc/x", undefined, "http://localhost:3000", {
        headers: { origin: "app://saas-forge" },
      }) as any,
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "app://saas-forge",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("redirects signed-in users away from auth pages", async () => {
    const middleware = await load();

    const response = await middleware(
      createRequest("/sign-in", "saas-forge.session_token=local-session") as any,
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("rejects bodies larger than the route's declared limit", async () => {
    const middleware = await load();

    const response = await middleware(
      createRequest(
        "/api/ai/speech/tts",
        "saas-forge.session_token=local-session",
        "http://localhost:3000",
        { method: "POST", headers: { "content-length": String(10 * 1024 * 1024) } },
      ) as any,
    );

    expect(response.status).toBe(413);
  });

  it("allows bodies within the route's declared limit", async () => {
    const middleware = await load();

    const response = await middleware(
      createRequest(
        "/api/ai/speech/tts",
        "saas-forge.session_token=local-session",
        "http://localhost:3000",
        { method: "POST", headers: { "content-length": "512" } },
      ) as any,
    );

    expect(response.status).toBe(200);
  });
});
