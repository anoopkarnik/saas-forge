import { createHash, randomBytes } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(bytes: Buffer, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i % bytes.length]! % 62];
  }
  return out;
}

export type GeneratedApiKey = {
  plaintext: string;
  prefix: string;
  hash: string;
};

export function generateApiKey(): GeneratedApiKey {
  const prefixBytes = randomBytes(16);
  const secretBytes = randomBytes(32);
  const prefix = `sk_${base62(prefixBytes, 10)}`;
  const secret = base62(secretBytes, 32);
  const plaintext = `${prefix}_${secret}`;
  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export type ParsedAuthHeader =
  | { ok: true; token: string }
  | { ok: false; reason: "missing" | "format" };

export function parseAuthHeader(header: string | null): ParsedAuthHeader {
  if (!header) return { ok: false, reason: "missing" };
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return { ok: false, reason: "format" };
  const token = match[1]!.trim();
  if (!token.startsWith("sk_")) return { ok: false, reason: "format" };
  return { ok: true, token };
}
