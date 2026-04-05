import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { auth } from "@workspace/auth/better-auth/auth";
import { ratelimit } from "@/server/ratelimit";

const DEFAULT_ORIGIN = "http://localhost:3000";

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
vi.mock("fs", () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
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

    mockUserUpdate.mockResolvedValue({});
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
      // First call: pnpm-workspace.yaml check returns true, second+ calls for scaffold root return false
      mockExistsSync
        .mockReturnValueOnce(true) // pnpm-workspace.yaml
        .mockReturnValue(false); // scaffoldRoot not found

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
      expect(mockAppend).toHaveBeenCalled(); // .env files
      expect(mockFinalize).toHaveBeenCalled();

      // Verify credits were deducted
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { creditsUsed: 20 }, // 0 + CREDITS_COST (20)
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
      // existsSync: true for workspace markers, true for scaffold root, false for .env.example
      mockExistsSync
        .mockReturnValueOnce(true) // pnpm-workspace.yaml
        .mockReturnValueOnce(true) // scaffoldRoot
        .mockReturnValueOnce(false); // .env.example does not exist

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
