import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthPost = vi.fn();
const mockAuthGet = vi.fn();

vi.mock("@workspace/auth/better-auth/auth", () => ({
  handlers: {
    POST: (...args: any[]) => mockAuthPost(...args),
    GET: (...args: any[]) => mockAuthGet(...args),
  },
}));

function createAuthRequest(url: string, init: RequestInit = {}) {
  return {
    url,
    method: init.method ?? "GET",
    headers: new Headers(init.headers),
    body: init.body ?? null,
  };
}

describe("Auth Route Integration Tests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockAuthPost.mockResolvedValue(new Response(null, { status: 200 }));
    mockAuthGet.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it("normalizes null-origin desktop requests without echoing unsafe CORS", async () => {
    const { POST } = await import("../../app/api/auth/[...all]/route.js");

    const request = createAuthRequest(
      "http://localhost:3000/api/auth/sign-in/social",
      {
        method: "POST",
        headers: {
          origin: "null",
          "content-type": "application/json",
        },
        body: JSON.stringify({ provider: "google" }),
      },
    );

    const response = await POST(request as any);

    expect(mockAuthPost).toHaveBeenCalledTimes(1);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("does not advertise file:// as an allowed CORS origin", async () => {
    const { GET } = await import("../../app/api/auth/[...all]/route.js");

    const request = createAuthRequest(
      "http://localhost:3000/api/auth/session",
      {
        method: "GET",
        headers: {
          origin: "file://",
        },
      },
    );

    const response = await GET(request as any);

    expect(mockAuthGet).toHaveBeenCalledTimes(1);
    expect(mockAuthGet.mock.calls[0]?.[0]?.headers.get("origin")).toBe(
      "file://",
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("keeps explicit desktop and web origins allowed for CORS", async () => {
    const { GET } = await import("../../app/api/auth/[...all]/route.js");

    const request = createAuthRequest(
      "http://localhost:3000/api/auth/session",
      {
        method: "GET",
        headers: {
          origin: "http://localhost:5173",
        },
      },
    );

    const response = await GET(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );
  });

  it("returns CORS headers on OPTIONS only for explicit allowed origins", async () => {
    const { OPTIONS } = await import("../../app/api/auth/[...all]/route.js");

    const allowedRequest = createAuthRequest(
      "http://localhost:3000/api/auth/session",
      {
        method: "OPTIONS",
        headers: {
          origin: "saas-forge://",
        },
      },
    );
    const disallowedRequest = createAuthRequest(
      "http://localhost:3000/api/auth/session",
      {
        method: "OPTIONS",
        headers: {
          origin: "file://",
        },
      },
    );

    const allowedResponse = await OPTIONS(allowedRequest as any);
    const disallowedResponse = await OPTIONS(disallowedRequest as any);

    expect(allowedResponse.headers.get("Access-Control-Allow-Origin")).toBe(
      "saas-forge://",
    );
    expect(
      disallowedResponse.headers.get("Access-Control-Allow-Origin"),
    ).toBeNull();
  });
});
