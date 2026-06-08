import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import db from "@workspace/database/client";
import {
  hashApiKey,
  parseAuthHeader,
  type ApiKeyScope,
} from "@workspace/auth/api-keys";
import { logger } from "@workspace/observability/winston-logger";
import { apiKeyRateLimit } from "./apiKeyRateLimit";

type AuthError =
  | "missing_authorization"
  | "invalid_authorization_format"
  | "invalid_api_key"
  | "api_key_revoked"
  | "api_key_expired"
  | "insufficient_scope"
  | "rate_limited";

const MESSAGES: Record<AuthError, string> = {
  missing_authorization: "Missing Authorization header.",
  invalid_authorization_format:
    "Authorization header must be in the form 'Bearer sk_...'.",
  invalid_api_key: "API key is invalid.",
  api_key_revoked: "API key has been revoked.",
  api_key_expired: "API key has expired.",
  insufficient_scope: "API key does not have the required scope.",
  rate_limited: "Rate limit exceeded for this API key.",
};

const STATUS: Record<AuthError, number> = {
  missing_authorization: 401,
  invalid_authorization_format: 401,
  invalid_api_key: 401,
  api_key_revoked: 401,
  api_key_expired: 401,
  insufficient_scope: 403,
  rate_limited: 429,
};

function failure(
  code: AuthError,
  init?: ResponseInit,
): { ok: false; response: NextResponse } {
  return {
    ok: false,
    response: NextResponse.json(
      { error: { code, message: MESSAGES[code] } },
      { status: STATUS[code], ...init },
    ),
  };
}

export type AuthenticateApiKeyResult =
  | { ok: true; userId: string; keyId: string; scopes: ApiKeyScope[] }
  | { ok: false; response: NextResponse };

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export async function authenticateApiKey(
  req: NextRequest,
  opts: { scopes: ApiKeyScope[] },
): Promise<AuthenticateApiKeyResult> {
  const parsed = parseAuthHeader(req.headers.get("authorization"));
  if (!parsed.ok) {
    const code: AuthError =
      parsed.reason === "missing"
        ? "missing_authorization"
        : "invalid_authorization_format";
    logger.warn(`apiKey.auth_failed ${JSON.stringify({ reason: code })}`);
    return failure(code);
  }

  const plaintext = parsed.token;
  // prefix = first 13 chars (sk_ + 10)
  const prefix = plaintext.slice(0, 13);

  const row = await db.apiKey.findUnique({ where: { keyPrefix: prefix } });

  if (!row) {
    logger.warn(`apiKey.auth_failed ${JSON.stringify({ reason: "invalid_api_key", prefix })}`);
    return failure("invalid_api_key");
  }

  if (!safeEqualHex(hashApiKey(plaintext), row.keyHash)) {
    logger.warn(`apiKey.auth_failed ${JSON.stringify({ reason: "invalid_api_key", prefix })}`);
    return failure("invalid_api_key");
  }

  if (row.status !== "active") {
    return failure("api_key_revoked");
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return failure("api_key_expired");
  }

  const missingScope = opts.scopes.find(
    (required) => !row.scopes.includes(required),
  );
  if (missingScope) {
    return failure("insufficient_scope");
  }

  const rl = await apiKeyRateLimit.limit(row.id);
  if (!rl.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rl.reset - Date.now()) / 1000),
    );
    return failure("rate_limited", {
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  // Fire-and-forget last-used update.
  db.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch((err: unknown) => {
      logger.error(
        `apiKey.last_used_update_failed ${JSON.stringify({ keyId: row.id, err: String(err) })}`,
      );
    });

  logger.info(
    `apiKey.used ${JSON.stringify({
      userId: row.userId,
      keyId: row.id,
      route: req.nextUrl.pathname,
      scopes: opts.scopes,
    })}`,
  );

  return {
    ok: true,
    userId: row.userId,
    keyId: row.id,
    scopes: row.scopes as ApiKeyScope[],
  };
}
