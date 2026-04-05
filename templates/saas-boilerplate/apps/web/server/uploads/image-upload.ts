import { put } from "@vercel/blob";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";

const DEFAULT_STORAGE_PROVIDER = "vercel_blob";
const SAFE_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);

const IMAGE_OUTPUTS = {
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
  png: { extension: "png", contentType: "image/png" },
  webp: { extension: "webp", contentType: "image/webp" },
} as const;

type SafeImageFormat = keyof typeof IMAGE_OUTPUTS;

type NormalizeImageUploadOptions = {
  file: File;
  maxSizeBytes: number;
};

type NormalizeImageUploadResult = {
  buffer: Buffer;
  extension: string;
  contentType: string;
};

type UploadNormalizedImageOptions = NormalizeImageUploadResult & {
  keyPrefix: string;
};

const createUploadError = (message: string) => {
  return new Error(message);
};

const getSafeImageFormat = async (buffer: Buffer): Promise<SafeImageFormat> => {
  let metadata;

  try {
    metadata = await sharp(buffer, { failOn: "error" }).metadata();
  } catch {
    throw createUploadError(
      "Invalid image file. Please upload a valid PNG, JPEG, or WebP image.",
    );
  }

  const format = metadata.format;

  if (!format || !SAFE_IMAGE_FORMATS.has(format)) {
    throw createUploadError(
      "Unsupported image format. Only PNG, JPEG, and WebP images are allowed.",
    );
  }

  return format as SafeImageFormat;
};

export const normalizeImageUpload = async ({
  file,
  maxSizeBytes,
}: NormalizeImageUploadOptions): Promise<NormalizeImageUploadResult> => {
  if (file.size > maxSizeBytes) {
    throw createUploadError(
      `File size exceeds ${Math.floor(maxSizeBytes / (1024 * 1024))}MB limit.`,
    );
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const format = await getSafeImageFormat(inputBuffer);
  const { extension, contentType } = IMAGE_OUTPUTS[format];

  let buffer: Buffer;

  try {
    buffer = await sharp(inputBuffer, { failOn: "error" })
      .rotate()
      .toFormat(format)
      .toBuffer();
  } catch {
    throw createUploadError(
      "Invalid image file. Please upload a valid PNG, JPEG, or WebP image.",
    );
  }

  return {
    buffer,
    extension,
    contentType,
  };
};

const buildObjectKey = (prefix: string, extension: string) => {
  return `${prefix}/${Date.now()}-${randomUUID()}.${extension}`;
};

const uploadToR2 = async ({
  buffer,
  keyPrefix,
  extension,
  contentType,
}: UploadNormalizedImageOptions) => {
  const key = buildObjectKey(keyPrefix, extension);
  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
};

const uploadToBlob = async ({
  buffer,
  keyPrefix,
  extension,
  contentType,
}: UploadNormalizedImageOptions) => {
  const blob = await put(buildObjectKey(keyPrefix, extension), buffer, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType,
    addRandomSuffix: false,
  });

  return blob.url;
};

export const uploadNormalizedImage = async (
  options: UploadNormalizedImageOptions,
) => {
  const storageProvider =
    process.env.NEXT_PUBLIC_IMAGE_STORAGE || DEFAULT_STORAGE_PROVIDER;

  if (storageProvider === "cloudflare_r2") {
    return uploadToR2(options);
  }

  return uploadToBlob(options);
};
