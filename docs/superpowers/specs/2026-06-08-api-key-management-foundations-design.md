# API Key Management — Foundations Implementation Design

Companion to `2026-04-07-17-api-key-management-developer-access-design.mdx`. That document is the high-level product spec. This document is the concrete implementation design for the **foundations-only** slice agreed with the user on 2026-06-08.

## Scope

Foundations only. Ship the API-key infrastructure end-to-end so future features can plug into it. Explicitly **not** included:

- Organization / multi-tenant ownership (Org model does not exist yet)
- Public REST documentation surface (only one endpoint exists)
- Test-mode keys (`sk_test_`)
- Per-key rate-limit overrides
- Cursor pagination on the list endpoint
- IP allowlisting
- Outbound webhook integration (not built)

## Why foundations only

Spec `#17` explicitly depends on `#1` (multi-tenancy), `#13` (audit logs), `#15` (usage metering), and `#16` (outgoing webhooks). None of those models exist in the Prisma schema today. Building API keys against missing primitives produces stubs that have to be rewritten when the primitives land. The foundations slice is forward-compatible (column-level additions, no breaking renames) and unblocks the demo / future endpoints without speculating on the deferred features.

## Architecture overview

```
Client → POST /api/v1/me  ─┐
                           ├─ apps/web/middleware.ts adds /api/v1 to publicRoutes
                           │  (skips Better Auth session redirect; route enforces auth itself)
                           │
                           ▼
            apps/web/app/api/v1/me/route.ts
              const auth = await authenticateApiKey(req, { scopes: ["read:me"] })
                           │
                           ▼
            apps/web/server/authenticateApiKey.ts
              1. parseAuthHeader               (packages/auth/src/api-keys/hash.ts)
              2. db.apiKey.findUnique by keyPrefix (active + not expired)
              3. timing-safe compare hashKey(plaintext) vs row.keyHash
              4. scope intersection check
              5. apiKeyRateLimit.limit(keyId)
              6. fire-and-forget update lastUsedAt
              7. logger.info({ event: "apiKey.used", ... })
                           │
                           ▼
            route handler runs, returns JSON
```

Management surface (session-authenticated, separate from external API access):

```
/(home)/settings/api-keys/page.tsx
   └─ trpc.apiKey.list / create / revoke   (protectedProcedure)
       └─ apps/web/trpc/routers/apiKeyProcedures.ts
```

## Data model

Added to `packages/database/prisma/user.prisma`:

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

`User` gains `apiKeys ApiKey[]`. No `organizationId` column — added later when multi-tenancy ships.

**Migration handling:** per `CLAUDE.md`, this PR edits the Prisma schema only. The project owner runs `pnpm migrate` to generate the migration file.

## Key format

```
sk_<10-char-base62-prefix>_<32-char-base62-secret>
```

- `keyPrefix` stored = `"sk_<10-chars>"` (13 chars total, unique, indexed)
- `keyHash` stored = `sha256(fullKey)` hex (64 chars)
- Generated via `crypto.randomBytes(24)` → base62-encoded → split into prefix and secret
- No `sk_live_` / `sk_test_` distinction in foundations

Entropy in the secret portion is ~190 bits, well above any practical brute-force threshold against a SHA-256 hash store.

## Scope vocabulary

Hierarchical strings, catalog-validated at create time. Stored as `String[]`.

```ts
// packages/auth/src/api-keys/scopes.ts
export const API_KEY_SCOPES = ["read:me"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export function isValidScope(value: string): value is ApiKeyScope;
```

Only `read:me` ships in the catalog (matches the only protected route shipped). Future PRs extend `API_KEY_SCOPES` when they add endpoints. Wildcards are not supported; namespaces are convention only.

## Auth helper contract

```ts
// apps/web/server/authenticateApiKey.ts
type Result =
  | { ok: true; userId: string; keyId: string; scopes: ApiKeyScope[] }
  | { ok: false; response: NextResponse };

export async function authenticateApiKey(
  req: NextRequest,
  opts: { scopes: ApiKeyScope[] },
): Promise<Result>;
```

Failure responses share the shape `{ error: { code, message } }`:

| HTTP | `error.code`                   | When                                         |
| ---- | ------------------------------ | -------------------------------------------- |
| 401  | `missing_authorization`        | no `Authorization` header                    |
| 401  | `invalid_authorization_format` | header not `Bearer sk_...`                   |
| 401  | `invalid_api_key`              | prefix not found OR hash mismatch            |
| 401  | `api_key_revoked`              | row found but `status = revoked`             |
| 401  | `api_key_expired`              | row found but past `expiresAt`               |
| 403  | `insufficient_scope`           | required scope not in key's `scopes`         |
| 429  | `rate_limited`                 | per-key Upstash limit exceeded; `Retry-After`|

Constant-time comparison via `crypto.timingSafeEqual` on the hash. Prefix-not-found and hash-mismatch return the same `invalid_api_key` code (no oracle).

### Lifecycle side-effects on success

1. `db.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } })` — fire-and-forget; errors logged but do not fail the request.
2. `apiKeyRateLimit.limit(keyId)` — called **after** hash verification so anonymous traffic doesn't burn a valid key's quota.
3. `logger.info({ event: "apiKey.used", userId, keyId, route, scope })`.

## Rate limiting

```ts
// apps/web/server/apiKeyRateLimit.ts
export const apiKeyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  analytics: true,
  prefix: "saas-forge:apikey",
});
```

60 req/min per key, sliding window. Identifier = `keyId`. Not per-IP, not per-user. Per-key overrides deferred.

## tRPC procedures

New router `apps/web/trpc/routers/apiKeyProcedures.ts`, registered in `_app.ts`:

```ts
list:   protectedProcedure.query()                                          // user's own
create: protectedProcedure.input({ label, scopes, expiresAt? }).mutation()  // returns { key, plaintext } ONCE
revoke: protectedProcedure.input({ id }).mutation()                         // sets status=revoked, revokedAt=now()
```

- `create` validates each scope via `isValidScope`.
- `create` returns the plaintext key **only** in this response; nothing else stores or returns it.
- `revoke` returns `NOT_FOUND` for keys not owned by `ctx.session.user.id` (no info leak).
- `list` never selects `keyHash`.

## UI

New route group `apps/web/app/(home)/settings/` with one entry `api-keys/`.

```
(home)/settings/
  layout.tsx
  api-keys/
    page.tsx
    _components/
      ApiKeyList.tsx
      CreateKeyDialog.tsx
      RevealKeyDialog.tsx
```

- `layout.tsx`: a settings shell with a sidebar containing only "API Keys" for now (matches existing admin shell pattern).
- `page.tsx`: server component, prefetches `trpc.apiKey.list.queryOptions()`, renders inside a `HydrationBoundary`.
- `CreateKeyDialog`: label input + scope checkboxes (driven by `API_KEY_SCOPES`) + optional expiry date.
- `RevealKeyDialog`: opened with the plaintext returned from `create`. Shows the key, a copy-to-clipboard button, and a red banner: "This is the only time you will see this key. Copy it now." On close → plaintext dropped from React state; list refetches.

Uses existing shadcn primitives from `@workspace/ui/components/shadcn/*`.

## Middleware

`apps/web/middleware.ts` `publicRoutes` adds `"/api/v1"`. Single-line change. The route handler enforces auth via `authenticateApiKey`; the cookie-based session redirect must not run for these routes.

## Audit / observability

Structured events via `packages/observability` `logger`:

```ts
logger.info({ event: "apiKey.created",     userId, keyId, scopes });
logger.info({ event: "apiKey.revoked",     userId, keyId });
logger.info({ event: "apiKey.used",        userId, keyId, route, scope });
logger.warn({ event: "apiKey.auth_failed", reason, prefix }); // never the secret
```

Event names are the contract a future audit-log ingester (spec `#13`) will consume.

## Testing

All Vitest, web-app pattern. Real DB for router-level tests, following `apps/web/trpc/routers/__tests__/aiJobs.test.ts`.

```
apps/web/server/__tests__/authenticateApiKey.test.ts
  missing header              → 401 missing_authorization
  malformed header            → 401 invalid_authorization_format
  unknown prefix              → 401 invalid_api_key
  prefix found, hash mismatch → 401 invalid_api_key
  revoked key                 → 401 api_key_revoked
  expired key                 → 401 api_key_expired
  insufficient scope          → 403 insufficient_scope
  happy path                  → ok, lastUsedAt updated
  rate-limit exhausted        → 429 rate_limited with Retry-After

packages/auth/src/api-keys/__tests__/hash.test.ts
  generateKey prefix shape
  hashKey deterministic, 64 hex chars
  parseAuthHeader (Bearer / bearer / missing / malformed)

apps/web/trpc/routers/__tests__/apiKeys.test.ts
  create rejects unknown scope
  create returns plaintext once; DB has hash, not plaintext
  list never returns keyHash
  revoke 404s other-user keys; 200 on own
```

## Files touched

```
packages/database/prisma/user.prisma                          MODIFY (add ApiKey, enum, User relation)
packages/auth/src/api-keys/scopes.ts                          NEW
packages/auth/src/api-keys/hash.ts                            NEW
packages/auth/src/api-keys/index.ts                           NEW
packages/auth/src/api-keys/__tests__/hash.test.ts             NEW
packages/auth/package.json                                    MODIFY (add export subpath)

apps/web/server/authenticateApiKey.ts                         NEW
apps/web/server/apiKeyRateLimit.ts                            NEW
apps/web/server/__tests__/authenticateApiKey.test.ts          NEW

apps/web/app/api/v1/me/route.ts                               NEW

apps/web/middleware.ts                                        MODIFY (publicRoutes += /api/v1)

apps/web/trpc/routers/apiKeyProcedures.ts                     NEW
apps/web/trpc/routers/_app.ts                                 MODIFY (register router)
apps/web/trpc/routers/__tests__/apiKeys.test.ts               NEW

apps/web/app/(home)/settings/layout.tsx                       NEW
apps/web/app/(home)/settings/api-keys/page.tsx                NEW
apps/web/app/(home)/settings/api-keys/_components/ApiKeyList.tsx       NEW
apps/web/app/(home)/settings/api-keys/_components/CreateKeyDialog.tsx  NEW
apps/web/app/(home)/settings/api-keys/_components/RevealKeyDialog.tsx  NEW
```

## Verification (maps to product-spec lines 64–69)

| Product-spec check                                | Met by                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| User can create a key and see raw secret only once| `create` mutation + `RevealKeyDialog`; no GET endpoint returns secret |
| Revoked keys stop working immediately             | `authenticateApiKey` checks `status = active`; no caching             |
| Scope checks prevent unauthorized endpoints       | Per-route `scopes: [...]` to helper; 403 on miss                      |
| Last-used + audit entries update on success       | `lastUsedAt` write + `logger.info("apiKey.used")`                     |
| Rate limits apply per key                         | `apiKeyRateLimit.limit(keyId)` after hash verification                |

## Risks called out by the product spec

| Risk                                                                | Mitigation                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Raw keys must never be stored retrievably                           | SHA-256 hash only; plaintext returned exactly once from `create`           |
| Scopes must be explicit                                             | Catalog-validated `String[]`; routes declare required scopes; no wildcards |
| User-vs-org ownership should follow multi-tenancy design            | Foundations: user-owned only. `organizationId` column added when `#1` ships|
| Rate limiting and metering should align                             | Single Upstash prefix `saas-forge:apikey`, identifier `keyId`              |

## Open items left for follow-ups

- Org ownership column + UI (after `#1` lands)
- Audit-log ingester subscribes to `apiKey.*` events (after `#13` lands)
- Public REST docs page once the surface grows beyond `/api/v1/me`
- Per-key rate-limit overrides + quota dashboards (after `#15` lands)
