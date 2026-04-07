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
const mockCreateTempScaffoldDir = vi.fn();
const mockCompileScaffoldVariant = vi.fn();

vi.mock("@/lib/scaffold-modules", () => ({
  InvalidScaffoldModuleError: MockInvalidScaffoldModuleError,
  loadScaffoldRegistry: (...args: any[]) => mockLoadScaffoldRegistry(...args),
  validateSelectedModules: (...args: any[]) =>
    mockValidateSelectedModules(...args),
  calculateScaffoldCredits: (...args: any[]) =>
    mockCalculateScaffoldCredits(...args),
  createTempScaffoldDir: (...args: any[]) => mockCreateTempScaffoldDir(...args),
  compileScaffoldVariant: (...args: any[]) => mockCompileScaffoldVariant(...args),
}));

// Mock archiver - each call creates a fresh callback set to avoid cross-test leakage
const mockDirectory = vi.fn();
const mockAppend = vi.fn();
const mockFinalize = vi.fn();
const mockAbort = vi.fn();

vi.mock("archiver", () => ({
  default: vi.fn(() => {
    const callbacks: Record<string, Function[]> = {};
    const instance = {
      directory: (...args: any[]) => {
        mockDirectory(...args);
        return instance;
      },
      append: (...args: any[]) => {
        mockAppend(...args);
        return instance;
      },
      finalize: () => {
        mockFinalize();
        // Fire end synchronously (no data in mock - we only test that archive methods were called)
        setTimeout(() => {
          callbacks["end"]?.forEach((cb) => cb());
        }, 5);
        return Promise.resolve();
      },
      on: (event: string, cb: any) => {
        if (!callbacks[event]) callbacks[event] = [];
        callbacks[event].push(cb);
        return instance;
      },
      abort: (...args: any[]) => {
        mockAbort(...args);
        return instance;
      },
    };
    return instance;
  }),
}));

// Mock fs
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockRmSync = vi.fn();
vi.mock("node:fs", () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    rmSync: (...args: any[]) => mockRmSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  rmSync: (...args: any[]) => mockRmSync(...args),
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

    // Default: scaffold root exists, .env.example exists
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("DATABASE_URL=\nNEXT_PUBLIC_URL=\n");
    mockRmSync.mockReturnValue(undefined);

    mockUserUpdate.mockResolvedValue({});

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
    mockCreateTempScaffoldDir.mockReturnValue("/tmp/saas-forge-scaffold-test");
    mockCompileScaffoldVariant.mockImplementation(({ tempDir }: any) => tempDir);
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
      expect(mockUserUpdate).not.toHaveBeenCalled();
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
      expect(mockUserUpdate).not.toHaveBeenCalled();
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

    it("should return 500 when scaffold root is not found", async () => {
      mockExistsSync.mockImplementation((target: string) => {
        const value = String(target);
        if (
          value.includes(".generated/saas-boilerplate") ||
          value.includes("templates/saas-boilerplate")
        ) {
          return false;
        }

        return true;
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
      expect(mockUserUpdate).not.toHaveBeenCalled();
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
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("should successfully generate and stream a zip file", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const envVars = {
        DATABASE_URL: "postgresql://localhost:5432/mydb",
        NEXT_PUBLIC_URL: "http://localhost:3000",
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

      // Verify archive methods were called
      expect(mockDirectory).toHaveBeenCalled();
      expect(mockCreateTempScaffoldDir).toHaveBeenCalled();
      expect(mockCompileScaffoldVariant).toHaveBeenCalledWith({
        baseRoot: expect.any(String),
        tempDir: "/tmp/saas-forge-scaffold-test",
        selectedModules: [],
        platforms: ["web"],
        registry: expect.any(Object),
      });
      expect(mockAppend).toHaveBeenCalled(); // .env files
      expect(mockFinalize).toHaveBeenCalled();

      // Verify credits were deducted
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { creditsUsed: 20 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockRmSync).toHaveBeenCalledWith(
        "/tmp/saas-forge-scaffold-test",
        { recursive: true, force: true },
      );
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
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { creditsUsed: 30 },
      });
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

    it("should generate .env content by merging with .env.example", async () => {
      mockReadFileSync.mockReturnValue(
        "# Database\nDATABASE_URL=\n\n# App\nNEXT_PUBLIC_URL=\nSOME_OTHER_VAR=default\n",
      );

      const { POST } = await import("../../app/api/scaffold/route.js");

      const envVars = {
        DATABASE_URL: "postgres://prod:5432/db",
        NEXT_PUBLIC_URL: "https://myapp.com",
      };

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "test", envVars }),
        },
      );

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      // Verify append was called with .env content
      expect(mockAppend).toHaveBeenCalled();
    });

    it("should generate .env from vars when no .env.example exists", async () => {
      mockExistsSync.mockImplementation((target: string) => {
        const value = String(target);
        if (value.endsWith("apps/web/.env.example")) {
          return false;
        }

        return true;
      });

      const { POST } = await import("../../app/api/scaffold/route.js");

      const envVars = {
        DATABASE_URL: "postgres://localhost/db",
        NEXT_PUBLIC_URL: "http://localhost:3000",
      };

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "test", envVars }),
        },
      );

      const response = await POST(request as any);
      expect(response.status).toBe(200);
    });

    it("should add DATABASE_URL .env in packages/database/", async () => {
      const { POST } = await import("../../app/api/scaffold/route.js");

      const envVars = {
        DATABASE_URL: "postgresql://localhost:5432/mydb",
      };

      const request = createScaffoldRequest(
        "http://localhost:3000/api/scaffold",
        {
          method: "POST",
          body: JSON.stringify({ name: "test", envVars }),
        },
      );

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      // Verify database .env was appended
      const appendCalls = mockAppend.mock.calls;
      const dbEnvCall = appendCalls.find(
        (call: any[]) =>
          typeof call[1] === "object" &&
          call[1].name?.includes("packages/database/.env"),
      );
      expect(dbEnvCall).toBeTruthy();
      expect(dbEnvCall![0]).toContain("postgresql://localhost:5432/mydb");
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
      expect(mockUserUpdate).not.toHaveBeenCalled();
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
