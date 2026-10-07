import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signing and secret storage for outgoing webhooks. A receiver verifies
 * `SaaSForge-Signature: t=<unix seconds>,v1=<hex hmac>` where the HMAC-SHA256
 * covers `${t}.${rawBody}`; see ./README.md for Node and Python snippets.
 */
export const SIGNATURE_HEADER = "SaaSForge-Signature";
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export const secretPrefix = (secret: string) => secret.slice(0, 12);

export function sign(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** One `v1` per secret: during a rotation both the new and the old secret sign. */
export function signatureHeader(secrets: string[], body: string, now = Date.now()): string {
  const timestamp = Math.floor(now / 1000);
  return [`t=${timestamp}`, ...secrets.map((secret) => `v1=${sign(secret, timestamp, body)}`)].join(",");
}

/** What a receiver runs: a fresh timestamp and any matching `v1`. */
export function verifySignature({
  header,
  body,
  secret,
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
  now = Date.now(),
}: {
  header: string;
  body: string;
  secret: string;
  toleranceSeconds?: number;
  now?: number;
}): boolean {
  const parts = header.split(",").map((part) => part.trim().split("="));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = Buffer.from(sign(secret, timestamp, body), "hex");
  return parts
    .filter(([key]) => key === "v1")
    .some(([, value]) => {
      const given = Buffer.from(value ?? "", "hex");
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

export class WebhookConfigError extends Error {}

// Signing needs the raw secret, so it is encrypted at rest (AES-256-GCM),
// never hashed. The key is derived from WEBHOOK_SECRET_KEY.
function encryptionKey(): Buffer {
  const raw = process.env.WEBHOOK_SECRET_KEY;
  if (!raw) throw new WebhookConfigError("Set WEBHOOK_SECRET_KEY to create webhook endpoints (`openssl rand -base64 32`).");
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), encrypted].map((part) => (typeof part === "string" ? part : part.toString("base64"))).join(":");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, encrypted] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new WebhookConfigError("Unreadable webhook secret.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}
