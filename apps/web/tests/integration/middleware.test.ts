import { afterEach, describe, expect, it, vi } from "vitest";

const createRequest = (
  path: string,
  cookieHeader?: string,
  baseUrl = "http://localhost:3000",
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
    method: "GET",
    headers: new Headers(),
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
