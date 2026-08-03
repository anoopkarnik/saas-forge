import { describe, it, expect, vi, beforeEach } from "vitest";

const { signInEmail } = vi.hoisted(() => ({ signInEmail: vi.fn() }));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { signInEmail } },
}));

import { POST } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEMO_GUEST_EMAIL = "demo@saas-forge.dev";
  process.env.DEMO_GUEST_PASSWORD = "demo-pass";
});

describe("POST /api/demo-login", () => {
  it("returns 503 when demo credentials are not configured", async () => {
    delete process.env.DEMO_GUEST_EMAIL;
    const res = await POST(new Request("http://localhost/api/demo-login", { method: "POST" }) as any);
    expect(res.status).toBe(503);
  });

  it("signs in the demo guest and redirects", async () => {
    signInEmail.mockResolvedValue({
      headers: new Headers({ "set-cookie": "better-auth.session_token=abc; Path=/" }),
      response: { user: { role: "guest" } },
    });
    const res = await POST(new Request("http://localhost/api/demo-login", { method: "POST" }) as any);
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: "demo@saas-forge.dev", password: "demo-pass" } }),
    );
    expect([302, 303, 307]).toContain(res.status);
    expect(res.headers.get("set-cookie")).toContain("better-auth.session_token");
  });

  it("refuses to sign in and drops the cookie when the account is not a guest", async () => {
    signInEmail.mockResolvedValue({
      headers: new Headers({ "set-cookie": "better-auth.session_token=abc; Path=/" }),
      response: { user: { role: "user" } },
    });
    const res = await POST(new Request("http://localhost/api/demo-login", { method: "POST" }) as any);
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
