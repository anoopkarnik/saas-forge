# API Key Management — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundational API-key infrastructure (model, hashing, scoped auth helper, per-key rate limiting, management UI, demo endpoint) for SaaS Forge so future external integrations can plug in.

**Architecture:** A new `ApiKey` row stores a hashed secret + identifying prefix + catalog-validated scope strings. A Node-runtime helper `authenticateApiKey(req, { scopes })` parses the `Authorization: Bearer sk_...` header, looks up the key by prefix, verifies the hash with `timingSafeEqual`, intersects required scopes, applies a per-key Upstash rate limit, fires-and-forgets a `lastUsedAt` write, and emits a structured `apiKey.used` log event. One demo route `/api/v1/me` exercises the helper end-to-end. A new `(home)/settings/api-keys` route group provides user self-service create/list/revoke with one-time plaintext reveal.

**Tech Stack:** Prisma, Next.js (App Router), tRPC, Better Auth, Upstash Ratelimit, shadcn UI, Vitest with mocked Prisma client.

**Design spec:** `docs/superpowers/specs/2026-06-08-api-key-management-foundations-design.md`

**Constraints (from project CLAUDE.md):**
- **Do NOT** run `pnpm migrate` or hand-write `migration.sql`. Edit the Prisma schema only and run `pnpm generate`. The project owner runs `pnpm migrate` separately.
- **Do NOT** commit changes unless the user asks. Each task's "commit" step prepares the commit message but the engineer should pause for the user before running `git commit`.

---

## Task 1: Add `ApiKey` model and `API_KEY_STATUS` enum to Prisma schema

**Files:**
- Modify: `packages/database/prisma/user.prisma`

- [ ] **Step 1: Add the model + enum at end of `user.prisma`**

Append to `packages/database/prisma/user.prisma`:

```prisma
model ApiKey {
    id          String         @id @default(cuid())
    userId      String
    label       String
    keyPrefix   String         @unique
    keyHash     String
    scopes      String[]
    status      API_KEY_STATUS @default(active)
    lastUsedAt  DateTime?
    expiresAt   DateTime?
    revokedAt   DateTime?
    createdAt   DateTime       @default(now())
    updatedAt   DateTime       @updatedAt

    user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
    @@index([status])
    @@schema("user_schema")
}

enum API_KEY_STATUS {
    active
    revoked

    @@schema("user_schema")
}
```

- [ ] **Step 2: Add the back-relation on `User`**

Inside `model User { ... }`, after the existing `aiCollections` relation line, add:

```prisma
    apiKeys          ApiKey[]
```

- [ ] **Step 3: Validate the schema**

Run: `pnpm --dir packages/database exec prisma validate`
Expected: `The schema at packages/database/prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Generate the Prisma client**

Run: `pnpm generate`
Expected: prints `Generated Prisma Client (...)` and exits 0. The generated client now exposes `db.apiKey`.

- [ ] **Step 5: Prepare commit (do NOT commit yet — see CLAUDE.md)**

```bash
git add packages/database/prisma/user.prisma
```

Commit message to use when the user approves:
```
feat(db): add ApiKey model and API_KEY_STATUS enum

Foundations for API key management. The user owner will run
`pnpm migrate` to generate the SQL migration.
```

---

## Task 2: Scope catalog (TDD)

**Files:**
- Create: `packages/auth/src/api-keys/scopes.ts`
- Test: `packages/auth/src/api-keys/__tests__/scopes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/auth/src/api-keys/__tests__/scopes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { API_KEY_SCOPES, isValidScope, type ApiKeyScope } from "../scopes";

describe("API_KEY_SCOPES", () => {
  it("includes the read:me foundational scope", () => {
    expect(API_KEY_SCOPES).toContain("read:me");
  });

  it("is a readonly tuple typed at compile time", () => {
    // Type-only check — ensures ApiKeyScope is a string union, not generic string.
    const sample: ApiKeyScope = "read:me";
    expect(sample).toBe("read:me");
  });
});

describe("isValidScope", () => {
  it("returns true for a known scope", () => {
    expect(isValidScope("read:me")).toBe(true);
  });

  it("returns false for an unknown scope", () => {
    expect(isValidScope("write:everything")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidScope("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/auth exec vitest run src/api-keys/__tests__/scopes.test.ts`
Expected: FAIL with "Cannot find module '../scopes'".

- [ ] **Step 3: Implement `scopes.ts`**

Create `packages/auth/src/api-keys/scopes.ts`:

```ts
export const API_KEY_SCOPES = ["read:me"] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function isValidScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/auth exec vitest run src/api-keys/__tests__/scopes.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Prepare commit**

```bash
git add packages/auth/src/api-keys/scopes.ts packages/auth/src/api-keys/__tests__/scopes.test.ts
```

Commit message:
```
feat(auth): add API key scope catalog with isValidScope guard
```

---

## Task 3: Key generation, hashing, header parsing (TDD)

**Files:**
- Create: `packages/auth/src/api-keys/hash.ts`
- Test: `packages/auth/src/api-keys/__tests__/hash.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/auth/src/api-keys/__tests__/hash.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, parseAuthHeader } from "../hash";

describe("generateApiKey", () => {
  it("returns a plaintext key, prefix, and hash", () => {
    const result = generateApiKey();
    expect(result.plaintext).toMatch(/^sk_[A-Za-z0-9]{10}_[A-Za-z0-9]{32}$/);
    expect(result.prefix).toMatch(/^sk_[A-Za-z0-9]{10}$/);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("prefix matches the first 13 chars of plaintext", () => {
    const { plaintext, prefix } = generateApiKey();
    expect(plaintext.slice(0, 13)).toBe(prefix);
  });

  it("generates unique keys across calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.prefix).not.toBe(b.prefix);
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    expect(hashApiKey("sk_test")).toBe(hashApiKey("sk_test"));
  });

  it("returns a 64-char lowercase hex string", () => {
    expect(hashApiKey("sk_test")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes with input", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("parseAuthHeader", () => {
  it("extracts the token from a well-formed Bearer header", () => {
    expect(parseAuthHeader("Bearer sk_abc_def")).toEqual({
      ok: true,
      token: "sk_abc_def",
    });
  });

  it("accepts lowercase bearer", () => {
    expect(parseAuthHeader("bearer sk_abc_def")).toEqual({
      ok: true,
      token: "sk_abc_def",
    });
  });

  it("rejects missing header (null)", () => {
    expect(parseAuthHeader(null)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("rejects header missing 'Bearer ' prefix", () => {
    expect(parseAuthHeader("sk_abc_def")).toEqual({
      ok: false,
      reason: "format",
    });
  });

  it("rejects token that doesn't start with sk_", () => {
    expect(parseAuthHeader("Bearer notakey")).toEqual({
      ok: false,
      reason: "format",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/auth exec vitest run src/api-keys/__tests__/hash.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `hash.ts`**

Create `packages/auth/src/api-keys/hash.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/auth exec vitest run src/api-keys/__tests__/hash.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Prepare commit**

```bash
git add packages/auth/src/api-keys/hash.ts packages/auth/src/api-keys/__tests__/hash.test.ts
```

Commit message:
```
feat(auth): add API key generation, hashing, and Bearer header parsing
```

---

## Task 4: Index re-exports for `@workspace/auth/api-keys`

**Files:**
- Create: `packages/auth/src/api-keys/index.ts`

The package's `package.json` already exposes `"./*": "./src/*.ts"`, so consumers can `import { generateApiKey } from "@workspace/auth/api-keys"`. No `package.json` change required.

- [ ] **Step 1: Create the barrel file**

Create `packages/auth/src/api-keys/index.ts`:

```ts
export * from "./scopes";
export * from "./hash";
```

- [ ] **Step 2: Typecheck the auth package**

Run: `pnpm --dir packages/auth exec tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add packages/auth/src/api-keys/index.ts
```

Commit message:
```
chore(auth): re-export api-keys utilities from index
```

---

## Task 5: Per-key Upstash rate limiter

**Files:**
- Create: `apps/web/server/apiKeyRateLimit.ts`

- [ ] **Step 1: Create the file**

Create `apps/web/server/apiKeyRateLimit.ts`:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const apiKeyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"), // 60 requests per minute per key
  analytics: true,
  prefix: "saas-forge:apikey",
});
```

- [ ] **Step 2: Typecheck the web app**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add apps/web/server/apiKeyRateLimit.ts
```

Commit message:
```
feat(web): add per-API-key Upstash rate limiter (60 req/min)
```

---

## Task 6: `authenticateApiKey` helper (TDD)

**Files:**
- Create: `apps/web/server/authenticateApiKey.ts`
- Test: `apps/web/server/__tests__/authenticateApiKey.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/server/__tests__/authenticateApiKey.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client surface for ApiKey
const apiKey = {
  findUnique: vi.fn(),
  update: vi.fn(async () => ({})),
};

vi.mock("@workspace/database/client", () => {
  const client: any = { apiKey };
  client.$extends = () => client;
  return { default: client };
});

// Mock Upstash rate limiter — default allow, individual tests override
const limitMock = vi.fn(async () => ({ success: true, reset: Date.now() + 60_000 }));
vi.mock("../apiKeyRateLimit", () => ({
  apiKeyRateLimit: { limit: limitMock },
}));

// Mock winston logger to silence
vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { NextRequest } from "next/server";
import { hashApiKey } from "@workspace/auth/api-keys";
import { authenticateApiKey } from "../authenticateApiKey";

function reqWith(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/v1/me", { headers });
}

const validPlaintext = "sk_aaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const validPrefix = "sk_aaaaaaaaaa";
const validHash = hashApiKey(validPlaintext);

const activeRow = {
  id: "k1",
  userId: "u1",
  keyHash: validHash,
  scopes: ["read:me"],
  status: "active",
  expiresAt: null,
};

describe("authenticateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
  });

  it("returns 401 missing_authorization when header absent", async () => {
    const r = await authenticateApiKey(reqWith(), { scopes: ["read:me"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(401);
    expect(await r.response.json()).toEqual({
      error: { code: "missing_authorization", message: expect.any(String) },
    });
  });

  it("returns 401 invalid_authorization_format when header malformed", async () => {
    const r = await authenticateApiKey(reqWith("garbage"), { scopes: ["read:me"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(401);
    expect((await r.response.json()).error.code).toBe("invalid_authorization_format");
  });

  it("returns 401 invalid_api_key when prefix not found", async () => {
    apiKey.findUnique.mockResolvedValueOnce(null);
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("invalid_api_key");
  });

  it("returns 401 invalid_api_key when hash mismatches (no oracle)", async () => {
    apiKey.findUnique.mockResolvedValueOnce({
      ...activeRow,
      keyHash: hashApiKey("sk_aaaaaaaaaa_DIFFERENT"),
    });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("invalid_api_key");
  });

  it("returns 401 api_key_revoked", async () => {
    apiKey.findUnique.mockResolvedValueOnce({ ...activeRow, status: "revoked" });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("api_key_revoked");
  });

  it("returns 401 api_key_expired", async () => {
    apiKey.findUnique.mockResolvedValueOnce({
      ...activeRow,
      expiresAt: new Date(Date.now() - 1000),
    });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect((await r.response.json()).error.code).toBe("api_key_expired");
  });

  it("returns 403 insufficient_scope when required scope not in key", async () => {
    apiKey.findUnique.mockResolvedValueOnce({ ...activeRow, scopes: [] });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(403);
    expect((await r.response.json()).error.code).toBe("insufficient_scope");
  });

  it("returns 429 rate_limited with Retry-After when limit exhausted", async () => {
    apiKey.findUnique.mockResolvedValueOnce(activeRow);
    limitMock.mockResolvedValueOnce({ success: false, reset: Date.now() + 30_000 });
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(429);
    expect((await r.response.json()).error.code).toBe("rate_limited");
    expect(r.response.headers.get("Retry-After")).not.toBeNull();
  });

  it("returns ok and updates lastUsedAt on success", async () => {
    apiKey.findUnique.mockResolvedValueOnce(activeRow);
    const r = await authenticateApiKey(reqWith(`Bearer ${validPlaintext}`), {
      scopes: ["read:me"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.userId).toBe("u1");
    expect(r.keyId).toBe("k1");
    expect(r.scopes).toEqual(["read:me"]);
    // lastUsedAt fire-and-forget — give microtask queue a tick
    await new Promise((resolve) => setImmediate(resolve));
    expect(apiKey.update).toHaveBeenCalledWith({
      where: { id: "k1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run server/__tests__/authenticateApiKey.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `apps/web/server/authenticateApiKey.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run server/__tests__/authenticateApiKey.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Prepare commit**

```bash
git add apps/web/server/authenticateApiKey.ts apps/web/server/__tests__/authenticateApiKey.test.ts
```

Commit message:
```
feat(web): add authenticateApiKey helper with scope + rate-limit checks
```

---

## Task 7: Demo route `GET /api/v1/me`

**Files:**
- Create: `apps/web/app/api/v1/me/route.ts`

- [ ] **Step 1: Create the route**

Create `apps/web/app/api/v1/me/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import db from "@workspace/database/client";
import { authenticateApiKey } from "@/server/authenticateApiKey";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, { scopes: ["read:me"] });
  if (!auth.ok) return auth.response;

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: { code: "user_not_found", message: "User no longer exists." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ user });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add apps/web/app/api/v1/me/route.ts
```

Commit message:
```
feat(web): add GET /api/v1/me as the first API-key authenticated route
```

---

## Task 8: Add `/api/v1` to middleware public routes

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Update `publicRoutes`**

In `apps/web/middleware.ts`, find:

```ts
const publicRoutes = [
  "/landing",
  "/public",
  "/api/payments/dodo/webhook",
  "/api/payments/stripe/webhook",
  "/api/trpc",
  "/auth-callback",
];
```

Replace with:

```ts
const publicRoutes = [
  "/landing",
  "/public",
  "/api/payments/dodo/webhook",
  "/api/payments/stripe/webhook",
  "/api/trpc",
  "/api/v1",
  "/auth-callback",
];
```

This skips Better Auth's cookie-redirect for `/api/v1/*`. API-key authentication is enforced inside the route handler.

- [ ] **Step 2: Smoke-test middleware compiles**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add apps/web/middleware.ts
```

Commit message:
```
feat(web): mark /api/v1 as public in middleware (key auth handled in routes)
```

---

## Task 9: tRPC `apiKey` router (TDD)

**Files:**
- Create: `apps/web/trpc/routers/apiKeyProcedures.ts`
- Test: `apps/web/trpc/routers/__tests__/apiKeys.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/trpc/routers/__tests__/apiKeys.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

const createdRows: any[] = [];
const stored = new Map<string, any>();

const apiKey = {
  create: vi.fn(async ({ data, select }: any) => {
    const row = {
      id: `k${stored.size + 1}`,
      ...data,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    stored.set(row.id, row);
    createdRows.push(row);
    const out: any = {};
    for (const k of Object.keys(select ?? row)) out[k] = (row as any)[k];
    return select ? out : row;
  }),
  findMany: vi.fn(async ({ where }: any) =>
    [...stored.values()].filter((r) => r.userId === where.userId).map((r) => ({
      id: r.id,
      label: r.label,
      keyPrefix: r.keyPrefix,
      scopes: r.scopes,
      status: r.status,
      lastUsedAt: r.lastUsedAt,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    })),
  ),
  findFirst: vi.fn(async ({ where }: any) => {
    for (const r of stored.values()) {
      if (r.id === where.id && r.userId === where.userId) return r;
    }
    return null;
  }),
  update: vi.fn(async ({ where, data }: any) => {
    const row = stored.get(where.id);
    if (!row) return null;
    Object.assign(row, data);
    return row;
  }),
};

vi.mock("@workspace/database/client", () => {
  const client: any = { apiKey };
  client.$extends = () => client;
  return { default: client };
});

vi.mock("@workspace/observability/winston-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { apiKeyRouter } from "../apiKeyProcedures";

const ctx = {
  headers: new Headers(),
  session: { user: { id: "u1", role: "user", email: "u1@example.com", name: "u" } },
} as any;

describe("apiKey router", () => {
  beforeEach(() => {
    stored.clear();
    createdRows.length = 0;
    vi.clearAllMocks();
  });

  it("create returns plaintext exactly once and persists hash only", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    const res = await caller.create({ label: "CI", scopes: ["read:me"] });

    expect(res.plaintext).toMatch(/^sk_[A-Za-z0-9]{10}_[A-Za-z0-9]{32}$/);
    expect(res.key.keyPrefix).toBe(res.plaintext.slice(0, 13));
    expect((res.key as any).keyHash).toBeUndefined();

    // DB row has hash, not plaintext
    expect(createdRows.length).toBe(1);
    expect(createdRows[0].keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(createdRows[0])).not.toContain(res.plaintext.slice(14));
  });

  it("create rejects unknown scope", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    await expect(
      caller.create({ label: "x", scopes: ["write:everything" as any] }),
    ).rejects.toThrow();
  });

  it("list returns only this user's keys without keyHash", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    await caller.create({ label: "k1", scopes: ["read:me"] });
    // Inject a foreign key directly into the store
    stored.set("foreign", {
      id: "foreign",
      userId: "other",
      label: "x",
      keyPrefix: "sk_zzzzzzzzzz",
      keyHash: "z",
      scopes: ["read:me"],
      status: "active",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    const rows = await caller.list();
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).keyHash).toBeUndefined();
  });

  it("revoke 404s on a key owned by another user", async () => {
    stored.set("foreign", {
      id: "foreign",
      userId: "other",
      label: "x",
      keyPrefix: "sk_zzzzzzzzzz",
      keyHash: "z",
      scopes: ["read:me"],
      status: "active",
    });
    const caller = apiKeyRouter.createCaller(ctx);
    await expect(caller.revoke({ id: "foreign" })).rejects.toThrow();
  });

  it("revoke marks the user's key as revoked", async () => {
    const caller = apiKeyRouter.createCaller(ctx);
    const createRes = await caller.create({ label: "k1", scopes: ["read:me"] });
    const res = await caller.revoke({ id: createRes.key.id });
    expect(res.id).toBe(createRes.key.id);
    expect(stored.get(createRes.key.id)!.status).toBe("revoked");
    expect(stored.get(createRes.key.id)!.revokedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run trpc/routers/__tests__/apiKeys.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the router**

Create `apps/web/trpc/routers/apiKeyProcedures.ts`:

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "@workspace/database/client";
import {
  API_KEY_SCOPES,
  generateApiKey,
  isValidScope,
  type ApiKeyScope,
} from "@workspace/auth/api-keys";
import { logger } from "@workspace/observability/winston-logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const scopeSchema = z
  .string()
  .refine(isValidScope, { message: "Unknown API key scope." });

const createInput = z.object({
  label: z.string().trim().min(1).max(100),
  scopes: z.array(scopeSchema).min(1).max(API_KEY_SCOPES.length),
  expiresAt: z.coerce.date().optional(),
});

const revokeInput = z.object({ id: z.string().min(1) });

const listSelect = {
  id: true,
  label: true,
  keyPrefix: true,
  scopes: true,
  status: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

export const apiKeyRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.apiKey.findMany({
      where: { userId: ctx.session.user.id },
      select: listSelect,
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const generated = generateApiKey();
      const row = await db.apiKey.create({
        data: {
          userId: ctx.session.user.id,
          label: input.label,
          keyPrefix: generated.prefix,
          keyHash: generated.hash,
          scopes: input.scopes as ApiKeyScope[],
          expiresAt: input.expiresAt ?? null,
        },
        select: listSelect,
      });
      logger.info(
        `apiKey.created ${JSON.stringify({
          userId: ctx.session.user.id,
          keyId: row.id,
          scopes: input.scopes,
        })}`,
      );
      return { key: row, plaintext: generated.plaintext };
    }),

  revoke: protectedProcedure
    .input(revokeInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.apiKey.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found.",
        });
      }
      const row = await db.apiKey.update({
        where: { id: existing.id },
        data: { status: "revoked", revokedAt: new Date() },
        select: { id: true, status: true, revokedAt: true },
      });
      logger.info(
        `apiKey.revoked ${JSON.stringify({
          userId: ctx.session.user.id,
          keyId: row.id,
        })}`,
      );
      return row;
    }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run trpc/routers/__tests__/apiKeys.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Prepare commit**

```bash
git add apps/web/trpc/routers/apiKeyProcedures.ts apps/web/trpc/routers/__tests__/apiKeys.test.ts
```

Commit message:
```
feat(trpc): add apiKey router (list / create / revoke) with one-time reveal
```

---

## Task 10: Register `apiKey` router in `_app.ts`

**Files:**
- Modify: `apps/web/trpc/routers/_app.ts`

- [ ] **Step 1: Add the import + key**

Replace `apps/web/trpc/routers/_app.ts` with:

```ts
import { supportRouter } from './supportProcedures';
import {  createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { billingRouter } from './billingProcedures';
import { seoRouter } from './seoProcedures';
import { aiRouter } from './aiProcedures';
import { aiJobsRouter } from './aiJobsProcedures';
import { apiKeyRouter } from './apiKeyProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    billing: billingRouter,
    seo: seoRouter,
    ai: aiRouter,
    aiJobs: aiJobsRouter,
    apiKey: apiKeyRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add apps/web/trpc/routers/_app.ts
```

Commit message:
```
chore(trpc): register apiKey router on the appRouter
```

---

## Task 11: Settings route group shell

**Files:**
- Create: `apps/web/app/(home)/settings/layout.tsx`
- Create: `apps/web/app/(home)/settings/page.tsx`

- [ ] **Step 1: Create the layout**

Create `apps/web/app/(home)/settings/layout.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8 md:flex-row md:gap-8">
      <aside className="md:w-56">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </h2>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/settings/api-keys"
            className="rounded-md px-3 py-2 text-foreground hover:bg-muted"
          >
            API Keys
          </Link>
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
```

- [ ] **Step 2: Create the index redirect**

Create `apps/web/app/(home)/settings/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function SettingsIndex() {
  redirect("/settings/api-keys");
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 4: Prepare commit**

```bash
git add "apps/web/app/(home)/settings/layout.tsx" "apps/web/app/(home)/settings/page.tsx"
```

Commit message:
```
feat(web): add /settings shell layout with API Keys nav entry
```

---

## Task 12: `ApiKeyList` component

**Files:**
- Create: `apps/web/app/(home)/settings/api-keys/_components/ApiKeyList.tsx`

- [ ] **Step 1: Implement**

Create `apps/web/app/(home)/settings/api-keys/_components/ApiKeyList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ListItem = {
  id: string;
  label: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked";
  lastUsedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
};

export function ApiKeyList({ onCreateClick }: { onCreateClick: () => void }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const list = useQuery(trpc.apiKey.list.queryOptions());
  const [busyId, setBusyId] = useState<string | null>(null);

  const revoke = useMutation(
    trpc.apiKey.revoke.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
      },
    }),
  );

  if (list.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (list.error) return <p className="text-sm text-destructive">{list.error.message}</p>;

  const rows = (list.data ?? []) as ListItem[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Create scoped keys for programmatic access. Keys are shown once at creation.
          </p>
        </div>
        <Button onClick={onCreateClick}>Create key</Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          You don't have any API keys yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.label}</span>
                  <Badge variant={row.status === "active" ? "default" : "secondary"}>
                    {row.status}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground">{row.keyPrefix}…</code>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  {row.scopes.map((s) => (
                    <span key={s} className="rounded bg-muted px-1.5 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last used: {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "never"}
                </p>
              </div>
              {row.status === "active" && (
                <Button
                  variant="destructive"
                  disabled={busyId === row.id || revoke.isPending}
                  onClick={async () => {
                    setBusyId(row.id);
                    try {
                      await revoke.mutateAsync({ id: row.id });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0. If `Badge` isn't imported anywhere yet, verify it exists at `packages/ui/src/components/shadcn/badge.tsx`; if missing, run `pnpm dlx shadcn@latest add badge -c packages/ui`.

- [ ] **Step 3: Prepare commit**

```bash
git add "apps/web/app/(home)/settings/api-keys/_components/ApiKeyList.tsx"
```

Commit message:
```
feat(web): add ApiKeyList component with revoke action
```

---

## Task 13: `CreateKeyDialog` component

**Files:**
- Create: `apps/web/app/(home)/settings/api-keys/_components/CreateKeyDialog.tsx`

- [ ] **Step 1: Implement**

Create `apps/web/app/(home)/settings/api-keys/_components/CreateKeyDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { Checkbox } from "@workspace/ui/components/shadcn/checkbox";
import { Button } from "@workspace/ui/components/shadcn/button";
import { API_KEY_SCOPES } from "@workspace/auth/api-keys";
import { useTRPC } from "@/trpc/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (plaintext: string) => void;
};

export function CreateKeyDialog({ open, onOpenChange, onCreated }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:me"]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation(
    trpc.apiKey.create.mutationOptions({
      onSuccess: async (res) => {
        await qc.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
        setLabel("");
        setScopes(["read:me"]);
        onOpenChange(false);
        onCreated(res.plaintext);
      },
      onError: (err) => setError(err.message),
    }),
  );

  function toggleScope(scope: string, checked: boolean) {
    setScopes((current) =>
      checked ? [...new Set([...current, scope])] : current.filter((s) => s !== scope),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Pick a label and the scopes this key needs. You'll see the key once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apikey-label">Label</Label>
            <Input
              id="apikey-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="CI runner"
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Scopes</Label>
            <div className="flex flex-col gap-2">
              {API_KEY_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(scope)}
                    onCheckedChange={(v) => toggleScope(scope, v === true)}
                  />
                  <code>{scope}</code>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!label.trim() || scopes.length === 0 || create.isPending}
            onClick={() => {
              setError(null);
              create.mutate({ label: label.trim(), scopes });
            }}
          >
            {create.isPending ? "Creating…" : "Create key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify shadcn primitives exist**

If `dialog`, `input`, `label`, or `checkbox` are missing under `packages/ui/src/components/shadcn/`, add them:

```bash
pnpm dlx shadcn@latest add dialog input label checkbox -c packages/ui
```

Then run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add "apps/web/app/(home)/settings/api-keys/_components/CreateKeyDialog.tsx"
```

Commit message:
```
feat(web): add CreateKeyDialog with label + scope selection
```

---

## Task 14: `RevealKeyDialog` component

**Files:**
- Create: `apps/web/app/(home)/settings/api-keys/_components/RevealKeyDialog.tsx`

- [ ] **Step 1: Implement**

Create `apps/web/app/(home)/settings/api-keys/_components/RevealKeyDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Button } from "@workspace/ui/components/shadcn/button";

type Props = {
  plaintext: string | null;
  onClose: () => void;
};

export function RevealKeyDialog({ plaintext, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!plaintext} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your new API key</DialogTitle>
          <DialogDescription>
            Copy this key now. You will not be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
        >
          This is the only time you will see this key. Copy it now.
        </div>

        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {plaintext}
        </pre>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Prepare commit**

```bash
git add "apps/web/app/(home)/settings/api-keys/_components/RevealKeyDialog.tsx"
```

Commit message:
```
feat(web): add RevealKeyDialog for one-time plaintext display
```

---

## Task 15: Settings API Keys page (wire everything together)

**Files:**
- Create: `apps/web/app/(home)/settings/api-keys/page.tsx`
- Create: `apps/web/app/(home)/settings/api-keys/_components/ApiKeysScreen.tsx`

- [ ] **Step 1: Create the client-side screen**

Create `apps/web/app/(home)/settings/api-keys/_components/ApiKeysScreen.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ApiKeyList } from "./ApiKeyList";
import { CreateKeyDialog } from "./CreateKeyDialog";
import { RevealKeyDialog } from "./RevealKeyDialog";

export function ApiKeysScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);

  return (
    <>
      <ApiKeyList onCreateClick={() => setCreateOpen(true)} />
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setPlaintext}
      />
      <RevealKeyDialog plaintext={plaintext} onClose={() => setPlaintext(null)} />
    </>
  );
}
```

- [ ] **Step 2: Create the server page that prefetches**

Create `apps/web/app/(home)/settings/api-keys/page.tsx`:

```tsx
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { ApiKeysScreen } from "./_components/ApiKeysScreen";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery(trpc.apiKey.list.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ApiKeysScreen />
    </HydrationBoundary>
  );
}
```

**Note for the implementer:** if `@/trpc/server` does not export `getQueryClient` / `trpc` under those exact names, follow the pattern used by another `(home)/*/page.tsx` that does server-side prefetch (e.g. `apps/web/app/(home)/ai/...` if it has one; otherwise mirror the prefetch pattern from the CLAUDE.md "Adding a Page" recipe).

- [ ] **Step 3: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 4: Prepare commit**

```bash
git add "apps/web/app/(home)/settings/api-keys/page.tsx" "apps/web/app/(home)/settings/api-keys/_components/ApiKeysScreen.tsx"
```

Commit message:
```
feat(web): wire /settings/api-keys page (list + create + one-time reveal)
```

---

## Task 16: Final verification

**Files:** none

- [ ] **Step 1: Run the full web typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 2: Run the affected unit tests**

Run:
```bash
pnpm --dir packages/auth test
pnpm --dir apps/web exec vitest run server/__tests__/authenticateApiKey.test.ts trpc/routers/__tests__/apiKeys.test.ts
```
Expected: all tests pass.

- [ ] **Step 3: Start dev server and exercise the UI**

Run: `pnpm dev`

1. Open `http://localhost:3000/settings/api-keys`.
2. Sign in if redirected to `/landing`.
3. Click **Create key**, set label `local-test`, leave `read:me` checked, click **Create key**.
4. Verify the reveal dialog shows a plaintext key starting `sk_`. Click **Copy**, then **Close**.
5. Verify the list shows the new key with only the prefix (e.g. `sk_a3f2b9c1d4…`) and status `active`.

- [ ] **Step 4: Exercise the demo endpoint**

In a new terminal, using the plaintext key copied above:

```bash
KEY="sk_..."   # paste the plaintext you copied

# Happy path
curl -i -H "Authorization: Bearer $KEY" http://localhost:3000/api/v1/me
# Expect: HTTP/1.1 200 OK, body { "user": { "id": ..., "email": ..., "name": ... } }

# Missing auth
curl -i http://localhost:3000/api/v1/me
# Expect: 401, error.code = "missing_authorization"

# Bad key
curl -i -H "Authorization: Bearer sk_bogus_bogus" http://localhost:3000/api/v1/me
# Expect: 401, error.code = "invalid_api_key"
```

- [ ] **Step 5: Revoke and re-test**

In the UI, click **Revoke** next to the key. Then re-run the happy-path curl:

```bash
curl -i -H "Authorization: Bearer $KEY" http://localhost:3000/api/v1/me
# Expect: 401, error.code = "api_key_revoked"
```

- [ ] **Step 6: Tell the user the migration is needed**

In the final report to the user, include this line:

> The Prisma schema now declares an `ApiKey` model + `API_KEY_STATUS` enum in the `user_schema`. Run `pnpm migrate` from the repo root to generate the migration SQL.

- [ ] **Step 7: Prepare release notes / summary**

Summarize for the user:
- Files added/modified (point to design doc for the full list)
- Commits prepared and waiting for `git commit` approval
- Migration that still needs to be generated
- Whether all tests + typecheck passed locally
