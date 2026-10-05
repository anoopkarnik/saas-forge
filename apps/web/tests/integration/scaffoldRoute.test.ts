import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { auth } from "@workspace/auth/better-auth/auth";
import { ratelimit } from "@/server/ratelimit";

const DEFAULT_ORIGIN = "http://localhost:3000";
class MockInvalidScaffoldModuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScaffoldModuleError";
  }
}

// Mock Auth
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock DB
const mockUserUpdate = vi.fn();
vi.mock("@workspace/database/client", () => ({
  default: {
    user: {
      update: (...args: any[]) => mockUserUpdate(...args),
    },
  },
}));

const mockCharge = vi.fn();
const mockBuild = vi.fn();
const mockCleanup = vi.fn();
// The route's own logic is under test; the shared builder has its own tests.
vi.mock("@/lib/scaffold/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scaffold/service")>();
  return {
    assertNoSecrets: actual.assertNoSecrets,
    formValuesFromEnv: actual.formValuesFromEnv,
    InsufficientCreditsError: actual.InsufficientCreditsError,
    ScaffoldRootNotFoundError: actual.ScaffoldRootNotFoundError,
    SecretNotAcceptedError: actual.SecretNotAcceptedError,
    buildProjectZip: (...args: any[]) => mockBuild(...args),
    chargeScaffoldCredits: (...args: any[]) => mockCharge(...args),
  };
});
vi.mock("@/lib/scaffold/template-version", () => ({
  getTemplateVersion: () => "1.4.1",
}));

// Mock ratelimit
vi.mock("@/server/ratelimit", () => ({
  ratelimit: {
    limit: vi.fn(),
  },
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockLoadScaffoldRegistry = vi.fn();
const mockValidateSelectedModules = vi.fn();
const mockCalculateScaffoldCredits = vi.fn();

vi.mock("@/lib/scaffold-modules", async (importOriginal) => ({
  isPriceChanged: (await importOriginal<typeof import("@/lib/scaffold-modules")>()).isPriceChanged,
  InvalidScaffoldModuleError: MockInvalidScaffoldModuleError,
  loadScaffoldRegistry: (...args: any[]) => mockLoadScaffoldRegistry(...args),
  validateSelectedModules: (...args: any[]) =>
    mockValidateSelectedModules(...args),
  calculateScaffoldCredits: (...args: any[]) =>
    mockCalculateScaffoldCredits(...args),
}));

function createScaffoldRequest(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!headers.has("origin")) {
    headers.set("origin", DEFAULT_ORIGIN);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    url,
    method: init.method ?? "GET",
    headers,
    async json() {
      if (typeof init.body === "string") {
        return JSON.parse(init.body);
      }
      return init.body ?? {};
    },
  };
}

describe("Scaffold Route Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user with enough credits
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: "session_1" },
      user: {
        id: "user_1",
        email: "test@test.com",
        name: "Test User",
        creditsTotal: 100,
        creditsUsed: 0,
      },
    } as any);

    vi.mocked(ratelimit.limit).mockResolvedValue({ success: true } as any);

    mockBuild.mockImplementation(() => ({
      stream: new ReadableStream({ start: (controller) => controller.close() }),
      pricing: {},
      cleanup: mockCleanup,
    }));

    mockUserUpdate.mockResolvedValue({});
    mockCharge.mockResolvedValue({ charged: 20, alreadyProcessed: false, jobId: "j1" });

    mockLoadScaffoldRegistry.mockReturnValue({
      baseCreditsCost: 20,
      modules: [
        {
          id: "billing",
          label: "Billing & Payments",
          default: false,
          creditsCost: 10,
          requires: [],
          incompatibleWith: [],
          downloadEnabled: true,
        },
        {
          id: "multi_tenancy",
          label: "Organizations / Teams",
          default: false,
          creditsCost: 15,
          requires: [],
          incompatibleWith: [],
          downloadEnabled: false,
        },
      ],
    });
    mockValidateSelectedModules.mockImplementation((modules = [], registry) => {
      const selected = [...new Set(modules)];
      const registryMap = new Map(
        (registry?.modules ?? []).map((module: any) => [module.id, module]),
      );

      for (const moduleId of selected) {
        const entry = registryMap.get(moduleId) as
          | { downloadEnabled?: boolean }
          | undefined;
        if (!entry) {
          throw new MockInvalidScaffoldModuleError(
            `Unknown scaffold module: ${moduleId}`,
          );
        }

        if (entry.downloadEnabled === false) {
          throw new MockInvalidScaffoldModuleError(
            `Scaffold module "${moduleId}" is not available for download yet`,
          );
        }
      }

      return selected;
    });
    mockCalculateScaffoldCredits.mockImplementation((selectedModules = []) => {
      const modules = selectedModules.map((moduleId: string) => ({
        moduleId,
        credits: moduleId === "billing" ? 10 : 0,
      }));

      return {
        baseCredits: 20,
        moduleCredits: modules,
        totalCredits:
          20 + modules.reduce((sum: number, entry: any) => sum + entry.credits, 0),
      };
    });
  });

  describe("POST handler", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "my-project", envVars: {} }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(ratelimit.limit).not.toHaveBeenCalled();
      expect(mockCharge).not.toHaveBeenCalled();
    });

    it("should return 403 for disallowed origins before auth work", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          headers: {
            origin: "https://evil.example.com",
          },
          body: JSON.stringify({ name: "my-project", envVars: {} }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(auth.api.getSession).not.toHaveBeenCalled();
      expect(ratelimit.limit).not.toHaveBeenCalled();
      expect(mockCharge).not.toHaveBeenCalled();
    });

    it("should return 429 when rate limit is exceeded", async () => {
      vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as any);

      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "my-project", envVars: {} }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
    });

    it("should return 403 for guest sessions before deducting credits", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: { id: "session_1" },
        user: {
          id: "guest_1",
          role: "guest",
          creditsTotal: 20,
          creditsUsed: 0,
        },
      } as any);

      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "my-project", envVars: {} }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("This is a read-only demo account.");
      expect(ratelimit.limit).not.toHaveBeenCalled();
      expect(mockCharge).not.toHaveBeenCalled();
    });

    it("should return 403 when user has insufficient credits", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: { id: "session_1" },
        user: { id: "user_1", creditsTotal: 10, creditsUsed: 5 },
      } as any);

      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "my-project", envVars: {} }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not enough credits");
    });

    it("should return 409 without charging when the expected price is stale", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "my-project", envVars: {}, expectedTotalCredits: 10 }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toEqual({ error: "price_changed", totalCredits: 20 });
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("should return 500 when scaffold root is not found", async () => {
      const { ScaffoldRootNotFoundError } = await import("@/lib/scaffold/service");
      mockBuild.mockImplementation(() => {
        throw new ScaffoldRootNotFoundError();
      });

      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "my-project", envVars: {} }),
        },
      );

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Scaffold root not found");
    });

    it("should return 400 for unknown scaffold modules", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const response = await POST(
        createScaffoldRequest("http://localhost:3000/api/scaffold", {
          method: "POST",
          body: JSON.stringify({
            name: "my-project",
            envVars: {},
            modules: ["does_not_exist"],
          }),
        }) as any,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Unknown scaffold module");
      expect(mockCharge).not.toHaveBeenCalled();
    });

    it("should return 400 for modules that are not downloadable yet", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const response = await POST(
        createScaffoldRequest("http://localhost:3000/api/scaffold", {
          method: "POST",
          body: JSON.stringify({
            name: "my-project",
            envVars: {},
            modules: ["multi_tenancy"],
          }),
        }) as any,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not available for download yet");
      expect(mockCharge).not.toHaveBeenCalled();
    });

    it("should successfully generate and stream a zip file", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const envVars = {
        NEXT_PUBLIC_URL: "http://localhost:3000",
        NEXT_PUBLIC_PLATFORM: "web,mobile",
      };

      const response = await POST(
        createScaffoldRequest("http://localhost:3000/api/scaffold", {
          method: "POST",
          headers: { origin: "http://localhost:5173" },
          body: JSON.stringify({ name: "My Test Project!", envVars }),
        }) as any,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");
      expect(response.headers.get("Content-Disposition")).toContain(".zip");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:5173",
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );

      // One shared builder for every download path.
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: "My-Test-Project",
          modules: [],
          platforms: ["web", "mobile"],
          envVars,
        }),
      );

      // Verify credits were deducted via the shared transactional charge
      expect(mockCharge).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_1", amount: 20 }),
      );
    });

    it("should clean up the build when charging fails", async () => {
      const { InsufficientCreditsError } = await import("@/lib/scaffold/service");
      mockCharge.mockRejectedValueOnce(new InsufficientCreditsError());
      const { POST } = await import("../../app/api/scaffold/route.js");

      const response = await POST(
        createScaffoldRequest("http://localhost:3000/api/scaffold", {
          method: "POST",
          body: JSON.stringify({ name: "test", envVars: {} }),
        }) as any,
      );

      expect(response.status).toBe(403);
      expect(mockCleanup).toHaveBeenCalled();
    });

    it("should add selected module credits to the scaffold total", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const response = await POST(
        createScaffoldRequest("http://localhost:3000/api/scaffold", {
          method: "POST",
          body: JSON.stringify({
            name: "billing-enabled",
            envVars: {
              NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe",
            },
            modules: ["billing"],
          }),
        }) as any,
      );

      expect(response.status).toBe(200);
      expect(mockCharge).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_1", amount: 30 }),
      );
    });

    it("should sanitize project name with special characters", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({
            name: "---My @#$ Project!!!---",
            envVars: {},
          }),
        },
      );

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      // The sanitized name appears in the Content-Disposition header
      const disposition = response.headers.get("Content-Disposition");
      expect(disposition).toContain("My-Project");
      expect(disposition).not.toContain("@");
      expect(disposition).not.toContain("#");
    });

    it.each([
      ["DATABASE_URL", "postgresql://canary-user:canary-pass@db/app"],
      ["STRIPE_SECRET_KEY", "sk_live_canary"],
      ["SOME_FUTURE_API_KEY", "canary"],
    ])("should reject %s with 400 before building or charging", async (key, value) => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const response = await POST(
        createScaffoldRequest("http://localhost:3000/api/scaffold", {
          method: "POST",
          body: JSON.stringify({
            name: "test",
            envVars: { NEXT_PUBLIC_URL: "https://myapp.com", [key]: value },
          }),
        }) as any,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "secret_not_accepted", keys: key });
      expect(JSON.stringify(data)).not.toContain(value);
      expect(mockBuild).not.toHaveBeenCalled();
      expect(mockCharge).not.toHaveBeenCalled();
    });
  });

  describe("GET handler", () => {
    it("should return 405 and disable legacy GET downloads", async () => {
      const { GET } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold?name=my-project",
        {
          method: "GET",
        },
      );

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
      expect(data.error).toBe("Method Not Allowed");
      expect(auth.api.getSession).not.toHaveBeenCalled();
      expect(mockCharge).not.toHaveBeenCalled();
    });
  });

  describe("OPTIONS handler", () => {
    it("should return CORS headers for allowed origins", async () => {
      const { OPTIONS } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "OPTIONS",
          headers: {
            origin: "http://localhost:5173",
          },
        },
      );

      const response = await OPTIONS(request as any);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:5173",
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );
      expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
    });

    it("should reject disallowed origins", async () => {
      const { OPTIONS } = await import("../../app/api/scaffold/route.js");

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "OPTIONS",
          headers: {
            origin: "https://evil.example.com",
          },
        },
      );

      const response = await OPTIONS(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(data.error).toBe("Forbidden");
    });
  });
});
