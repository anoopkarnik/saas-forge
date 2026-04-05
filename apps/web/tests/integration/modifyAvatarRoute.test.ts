import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@workspace/auth/better-auth/auth";
import { ratelimit } from "@/server/ratelimit";

const VALID_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+QpLXWQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

// Mock Auth
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
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

// Mock @vercel/blob
const mockPut = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...args: any[]) => mockPut(...args),
}));

// Mock @aws-sdk/client-s3
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

describe("ModifyAvatar Route Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: "session_1" },
      user: { id: "user_1", email: "test@test.com", name: "Test User" },
    } as any);

    vi.mocked(ratelimit.limit).mockResolvedValue({ success: true } as any);
  });

  describe("POST handler", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "avatar.png", { type: "image/png" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 429 when rate limit is exceeded", async () => {
      vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as any);

      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "avatar.png", { type: "image/png" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
    });

    it("should return 400 when no file is provided", async () => {
      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });

    it("should return 400 when file is not an image", async () => {
      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(["test"], "document.pdf", { type: "application/pdf" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid image file. Please upload a valid PNG, JPEG, or WebP image.",
      );
    });

    it("should return 400 when image mime is spoofed", async () => {
      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(["not-a-real-image"], "avatar.png", { type: "image/png" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Invalid image file. Please upload a valid PNG, JPEG, or WebP image.",
      );
    });

    it("should return 400 for unsupported image formats like SVG", async () => {
      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
          ],
          "avatar.svg",
          { type: "image/svg+xml" },
        ),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Unsupported image format. Only PNG, JPEG, and WebP images are allowed.",
      );
    });

    it("should return 400 when file exceeds 5MB", async () => {
      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      // Create a file slightly over 5MB
      const largeContent = new Uint8Array(5 * 1024 * 1024 + 1);
      const formData = new FormData();
      formData.append(
        "file",
        new File([largeContent], "large.png", { type: "image/png" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("File size exceeds 5MB limit.");
    });

    it("should upload to Vercel Blob by default", async () => {
      mockPut.mockResolvedValue({
        url: "https://blob.vercel.com/avatar.png",
      });

      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File([VALID_PNG_BYTES], "avatar.png", { type: "image/png" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe("https://blob.vercel.com/avatar.png");
      expect(mockPut).toHaveBeenCalledTimes(1);
      const blobUploadCall = mockPut.mock.calls[0];
      expect(blobUploadCall).toBeDefined();
      const [objectKey, uploadedBody, options] = blobUploadCall!;
      expect(objectKey).toMatch(/^profile-images\/.*\.png$/);
      expect(objectKey).not.toContain("avatar.png");
      expect(Buffer.isBuffer(uploadedBody)).toBe(true);
      expect(options).toEqual(
        expect.objectContaining({
          access: "public",
          addRandomSuffix: false,
          contentType: "image/png",
        }),
      );
    });

    it("should upload to Cloudflare R2 when configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_IMAGE_STORAGE", "cloudflare_r2");
      vi.stubEnv("R2_ACCOUNT_ID", "test_account");
      vi.stubEnv("R2_ACCESS_KEY_ID", "test_key");
      vi.stubEnv("R2_SECRET_ACCESS_KEY", "test_secret");
      vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
      vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://r2.test.com");
      mockS3Send.mockResolvedValue({});

      const { POST } =
        await import("../../app/api/settings/modifyAvatar/route.js");

      const formData = new FormData();
      formData.append(
        "file",
        new File([VALID_PNG_BYTES], "avatar.png", { type: "image/png" }),
      );

      const request = new Request(
        "http://localhost:3000/api/settings/modifyAvatar",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toContain("https://r2.test.com/");
      expect(data.url).toContain("profile-images/");
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const uploadCall = mockS3Send.mock.calls[0];
      expect(uploadCall).toBeDefined();
      const uploadParams = uploadCall![0];
      expect(uploadParams.Key).toMatch(/^profile-images\/.*\.png$/);
      expect(uploadParams.Key).not.toContain("avatar.png");
      expect(uploadParams.ContentType).toBe("image/png");
      expect(Buffer.isBuffer(uploadParams.Body)).toBe(true);

      vi.unstubAllEnvs();
    });
  });
});
