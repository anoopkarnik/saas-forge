import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@workspace/auth/better-auth/auth";
import { ratelimit } from "@/server/ratelimit";

const VALID_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+QpLXWQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/server/ratelimit", () => ({
  ratelimit: {
    limit: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

const mockPut = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...args: any[]) => mockPut(...args),
}));

const mockS3Send = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = mockS3Send;
  },
  PutObjectCommand: class MockPutObjectCommand {
    constructor(params: any) {
      Object.assign(this, params);
    }
  },
}));

describe("CMS Upload Route Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: "session_1" },
      user: {
        id: "admin_1",
        email: "admin@test.com",
        name: "Admin User",
        role: "admin",
      },
    } as any);

    vi.mocked(ratelimit.limit).mockResolvedValue({ success: true } as any);
  });

  describe("POST handler", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const { POST } = await import("../../app/api/cms/upload/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File([VALID_PNG_BYTES], "cms.png", { type: "image/png" }),
      );

      const request = new Request("http://localhost:3000/api/cms/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: { id: "session_1" },
        user: {
          id: "user_1",
          email: "user@test.com",
          name: "Regular User",
          role: "user",
        },
      } as any);

      const { POST } = await import("../../app/api/cms/upload/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File([VALID_PNG_BYTES], "cms.png", { type: "image/png" }),
      );

      const request = new Request("http://localhost:3000/api/cms/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when image mime is spoofed", async () => {
      const { POST } = await import("../../app/api/cms/upload/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(["not-a-real-image"], "cms.png", { type: "image/png" }),
      );

      const request = new Request("http://localhost:3000/api/cms/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid image file. Please upload a valid PNG, JPEG, or WebP image.",
      );
    });

    it("should return 400 for unsupported image formats like SVG", async () => {
      const { POST } = await import("../../app/api/cms/upload/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
          ],
          "cms.svg",
          { type: "image/svg+xml" },
        ),
      );

      const request = new Request("http://localhost:3000/api/cms/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Unsupported image format. Only PNG, JPEG, and WebP images are allowed.",
      );
    });

    it("should upload validated images to Vercel Blob by default", async () => {
      mockPut.mockResolvedValue({
        url: "https://blob.vercel.com/cms.png",
      });

      const { POST } = await import("../../app/api/cms/upload/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File([VALID_PNG_BYTES], "cms.png", { type: "image/png" }),
      );

      const request = new Request("http://localhost:3000/api/cms/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe("https://blob.vercel.com/cms.png");
      expect(mockPut).toHaveBeenCalledTimes(1);
      const blobUploadCall = mockPut.mock.calls[0];
      expect(blobUploadCall).toBeDefined();
      const [objectKey, uploadedBody, options] = blobUploadCall!;
      expect(objectKey).toMatch(/^cms-images\/.*\.png$/);
      expect(objectKey).not.toContain("cms.png");
      expect(Buffer.isBuffer(uploadedBody)).toBe(true);
      expect(options).toEqual(
        expect.objectContaining({
          access: "public",
          addRandomSuffix: false,
          contentType: "image/png",
        }),
      );
    });

    it("should upload validated images to Cloudflare R2 when configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_IMAGE_STORAGE", "cloudflare_r2");
      vi.stubEnv("R2_ACCOUNT_ID", "test_account");
      vi.stubEnv("R2_ACCESS_KEY_ID", "test_key");
      vi.stubEnv("R2_SECRET_ACCESS_KEY", "test_secret");
      vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
      vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://r2.test.com");

      mockS3Send.mockResolvedValue({});

      const { POST } = await import("../../app/api/cms/upload/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File([VALID_PNG_BYTES], "cms.png", { type: "image/png" }),
      );

      const request = new Request("http://localhost:3000/api/cms/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toContain("https://r2.test.com/");
      expect(data.url).toContain("cms-images/");
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const uploadCall = mockS3Send.mock.calls[0];
      expect(uploadCall).toBeDefined();
      const uploadParams = uploadCall![0];
      expect(uploadParams.Key).toMatch(/^cms-images\/.*\.png$/);
      expect(uploadParams.Key).not.toContain("cms.png");
      expect(uploadParams.ContentType).toBe("image/png");
      expect(Buffer.isBuffer(uploadParams.Body)).toBe(true);

      vi.unstubAllEnvs();
    });
  });
});
