# i18n Foundation and Core Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an i18n foundation (`packages/i18n`, next-intl on web, use-intl in shared UI, `User.locale`) and translate the core web surfaces into English and Spanish.

**Architecture:** `@workspace/i18n` owns locales, message catalogues (one JSON file per namespace, module namespaces behind scaffold markers in a TypeScript barrel), locale resolution and formatters. Web resolves the locale per request (user → cookie → `Accept-Language` → site setting → `en`) through next-intl's `getRequestConfig` with no URL prefix. `packages/ui` components call `use-intl` only, so desktop renders them under a plain `IntlProvider`.

**Tech Stack:** next-intl 4.14 / use-intl 4.14, Next 15 App Router, React 19, Better Auth 1.5.5, Prisma, Zod 4, Vitest 4 (happy-dom), `@formatjs/icu-messageformat-parser`.

**Spec:** `docs/superpowers/specs/2026-04-07-07-internationalization-i18n-design.mdx`

## Global Constraints

- Locales: `LOCALES = ["en", "es"] as const`; `DEFAULT_LOCALE = "en"`; cookie `NEXT_LOCALE`.
- Resolution order: `User.locale` → `NEXT_LOCALE` cookie → `Accept-Language` → site setting `i18n.defaultLocale` → `en`. Invalid values at any step are skipped.
- No URL prefix: do not touch `apps/web/middleware.ts` routing, `apps/web/lib/route-policy.ts`, or any page path.
- `packages/ui`, `apps/desktop` and `packages/email` import from `use-intl`, never `next-intl`. Only `apps/web` imports `next-intl`.
- A string that appears only inside a module's `scaffold:begin <module>` markers gets its key in that module's namespace file (`<module id>.json`), never in a shared namespace. Each module namespace file is added to that module's manifest `unselected.remove`.
- `packages/*` never import `apps/*`; no circular imports, including type-only ones (`pnpm arch:check`).
- ICU messages: never write an ASCII apostrophe directly before `{`, `}`, `#`, `<` or `|` (ICU treats `'` as an escape there). Use “typographic quotes” or «comillas» around placeholders.
- `email.send` gets `locale` as **optional**, so jobs already queued in Inngest still validate.
- Legal pages (`blocks/landing/{PrivacyPolicy,TermsOfService,CancellationRefundPolicies,ContactUs}.tsx`, `components/landing/LegalPageLayout.tsx`) stay English. Do not extract them.
- CMS-supplied text (landing sections, docs content) is data, not UI copy; do not route it through `t()`.
- Never create or edit `packages/database/prisma/migrations/**`; the owner runs `pnpm migrate`.
- Every commit that changes `apps/`, `packages/`, `template-overrides/` or `scaffold-modules/` runs `pnpm template:sync` first and includes `templates/saas-boilerplate` changes. If `template:sync` aborts on a missing include, restore `templates/` from HEAD (`git checkout HEAD -- templates/saas-boilerplate`) and fix the cause before retrying.
- Commits are local on `main`; never push.

### Deviations from the spec, decided while planning

- **Formatting** uses `@workspace/i18n/format` with `useLocale()` instead of next-intl's `useFormatter()`. Plain functions work identically on web, desktop and in emails, and avoid next-intl's server/client `timeZone` mismatch warnings.
- **No `errors` namespace**: the generic error strings go in `common`. A new `home` namespace holds the starter home page copy.
- **Invitation emails** use the inviter's saved `User.locale`, not their current request locale. tRPC procedures and the Better Auth org hook don't share a request-scoped locale, and the saved value is what the inviter chose.
- **Desktop gets a static English `IntlProvider`** in this plan. It renders shared components that now call `useTranslations`, so it would crash without one. Choosing a locale on desktop stays a follow-up.
- **Root-platform-only labels** (Scaffolds, Projects, SEO Reports, AI Management, API Management, Credits usage, coming-soon downloads) live in `nav`. They ship to buyers as unused keys, which is harmless and avoids a root-only catalogue mechanism.

## Review Focus

1. **Duplicate `use-intl` copies.** If `next-intl` resolves a different `use-intl` than `packages/ui`, the React contexts differ and every shared component throws "No intl context found" on web. Task 2 Step 9 asserts a single hoisted copy.
2. **Changing language while signed in.** `User.locale` outranks the cookie, so a failed `updateUser` would leave the UI unchanged with no explanation. Task 9 tests that the cookie is set, `updateUser` is called, the page refreshes, and a failure shows a toast.
3. **ICU apostrophes.** `Type '{phrase}' to confirm` would render a literal `{phrase}`. Task 3's catalogue test parses every message and checks its arguments match English, and Task 8 asserts the Spanish delete label contains the real phrase.
4. **Typing the delete-confirmation phrase in Spanish.** The comparison must use the translated phrase (`eliminar permanentemente`), or Spanish users can never delete their account. Task 8 reads the label and the comparison from the same `deletePhrase` key, and its test asserts the Spanish label; reviewers should check that the comparison line uses `t("deletePhrase")`.
5. **Unselected modules.** A shared file or barrel that still references a removed module namespace breaks typecheck in that variant. `pnpm scaffold:matrix` in Task 12 typechecks every module alone and in pairs, and the leak check keeps module keys out of shared files.

---

## File Structure

**New package `packages/i18n`** (`@workspace/i18n`, exports `./*` → `./src/*.ts`):

| File | Responsibility |
|---|---|
| `src/config.ts` | `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `isLocale`, `toLocale`, `parseAcceptLanguage`, `resolveLocale` |
| `src/format.ts` | `formatDate`, `formatDateTime`, `formatRelative`, `formatNumber`, `formatCurrency` |
| `src/messages.ts` | `Messages` type, `getMessages(locale)` (English deep-merge fallback, cached), `use-intl` `AppConfig` augmentation |
| `src/messages/<locale>/index.ts` | Barrel of that locale's namespace JSON files; module imports inside markers |
| `src/messages/<locale>/<namespace>.json` | Messages |
| `src/errors.ts` | `onIntlError` (throw in tests, log each distinct error once elsewhere) |
| `src/cookie.ts` | `setLocaleCookie(locale)` (browser) |
| `src/catalogue.ts` | `flattenMessages`, `messageArguments`, `checkCatalogues`, `readCatalogue` |
| `src/catalogue.test.ts` | Runs the checks on the real catalogues (`pnpm i18n:check`) |

**Web:** `apps/web/i18n/request.ts` (next-intl request config), `apps/web/components/i18n/IntlClientProvider.tsx` (client provider with `onError`), `apps/web/hooks/useChangeLocale.ts` (cookie, `updateUser`, refresh).

**Shared UI:** `packages/ui/src/test/intl.tsx` (`renderWithIntl`), `packages/ui/src/components/misc/LocaleSwitcher.tsx`, `packages/ui/src/components/home/LanguageSettings.tsx`, `packages/ui/src/hooks/useAuthSchemas.tsx`.

**Auth:** `packages/auth/src/better-auth/user-fields.ts` (Better Auth additional fields, tested on their own).

**Email:** `packages/email/src/i18n.ts` (`emailTranslator`).

---

### Task 1: Lock the credit fields against client writes (security)

`creditsUsed` and `creditsTotal` are Better Auth `additionalFields` without `input: false`. Better Auth's `parseInputData` only refuses a field marked `input: false`, so any signed-in user can `POST /api/auth/update-user {"creditsTotal": 1000000}` and `POST /api/auth/sign-up/email` accepts it too. Credits are only ever written through Prisma (checked: no `updateUser` call passes credits), so locking them breaks nothing.

**Files:**
- Create: `packages/auth/src/better-auth/user-fields.ts`
- Create: `packages/auth/src/better-auth/user-fields.test.ts`
- Modify: `packages/auth/src/better-auth/auth.ts:93-103` (the `user.additionalFields` block)

**Interfaces:**
- Produces: `userAdditionalFields` (Better Auth `user.additionalFields` object). Task 4 adds `locale` to it.

- [ ] **Step 1: Write the failing test**

```ts
// packages/auth/src/better-auth/user-fields.test.ts
import { describe, expect, it } from "vitest";
import { parseUserInput } from "better-auth/db";
import { userAdditionalFields } from "./user-fields";

// Better Auth's own input parser, as sign-up and update-user call it.
const options = { user: { additionalFields: userAdditionalFields } } as Parameters<typeof parseUserInput>[0];

describe("userAdditionalFields", () => {
  it("refuses credit balances from sign-up and update-user bodies", () => {
    expect(() => parseUserInput(options, { creditsTotal: 1_000_000 }, "update")).toThrow(/not allowed/);
    expect(() => parseUserInput(options, { creditsUsed: 5 }, "create")).toThrow(/not allowed/);
  });

  it("drops a falsy credit value instead of writing it", () => {
    expect(parseUserInput(options, { creditsUsed: 0 }, "update")).not.toHaveProperty("creditsUsed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/auth exec vitest run src/better-auth/user-fields.test.ts`
Expected: FAIL, cannot resolve `./user-fields`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/auth/src/better-auth/user-fields.ts
import type { BetterAuthOptions } from "better-auth";

type AdditionalUserFields = NonNullable<NonNullable<BetterAuthOptions["user"]>["additionalFields"]>;

/**
 * Extra user columns Better Auth reads and returns in the session. Only
 * fields with `input: true` may come from sign-up or update-user bodies;
 * credit balances change through Prisma on the server only.
 */
export const userAdditionalFields = {
  creditsUsed: { type: "number", required: false, input: false },
  creditsTotal: { type: "number", required: false, input: false },
} satisfies AdditionalUserFields;
```

In `auth.ts`, import it and replace the inline object:

```ts
import { userAdditionalFields } from "./user-fields";
// …
    user: {
        additionalFields: userAdditionalFields,
        changeEmail: {
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --dir packages/auth exec vitest run && pnpm --dir packages/auth typecheck && pnpm --dir apps/web typecheck`
Expected: PASS. If typecheck flags `session.user.creditsUsed` as missing anywhere, the `satisfies` lost the literal types. Confirm `type: "number"` stays a literal; do not widen with `as AdditionalUserFields`.

- [ ] **Step 5: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/auth/src/better-auth templates/saas-boilerplate
git commit -m "fix(auth): refuse credit balances from sign-up and update-user bodies

creditsUsed and creditsTotal were Better Auth additional fields without
input: false, so any signed-in user could raise their own balance through
/api/auth/update-user.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `packages/i18n` foundation

**Files:**
- Create: `packages/i18n/package.json`, `packages/i18n/tsconfig.json`, `packages/i18n/vitest.config.mts`
- Create: `packages/i18n/src/config.ts`, `src/format.ts`, `src/messages.ts`, `src/errors.ts`, `src/cookie.ts`
- Create: `packages/i18n/src/messages/en/index.ts`, `src/messages/es/index.ts`, `src/messages/{en,es}/common.json`
- Create: `packages/i18n/src/config.test.ts`, `src/format.test.ts`, `src/messages.test.ts`
- Modify: `packages/ui/src/lib/utils/formatDate.ts`, `packages/ui/src/lib/utils/formatAmount.ts`, `apps/web/lib/utils/formatDate.ts`, `apps/web/lib/utils/formatAmount.ts` (become re-exports)
- Modify: `apps/web/next.config.mjs` (`transpilePackages` gains `"@workspace/i18n"`)

**Interfaces:**
- Produces:
  - `LOCALES: readonly ["en","es"]`, `type Locale`, `DEFAULT_LOCALE: Locale`, `LOCALE_COOKIE = "NEXT_LOCALE"`
  - `isLocale(value: unknown): value is Locale`; `toLocale(value: unknown): Locale | undefined`
  - `parseAcceptLanguage(header: string | null | undefined): Locale | undefined`
  - `resolveLocale(input: { userLocale?: unknown; cookie?: unknown; acceptLanguage?: string | null; siteDefault?: unknown }): Locale`
  - `formatDate(date: Date | string | number, locale?: Locale): string` (long date, the same output as today for `en`)
  - `formatDateTime(date, locale?)`, `formatRelative(date, locale?, now?: Date)`, `formatNumber(value: number, locale?)`, `formatCurrency(amountMinor: number, currency: string, locale?)`
  - `type Messages`; `getMessages(locale: Locale): Messages`
  - `onIntlError(error: Error): void`
  - `setLocaleCookie(locale: Locale): void`

- [ ] **Step 1: Create the package skeleton**

```json
// packages/i18n/package.json
{
  "name": "@workspace/i18n",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "test:coverage": "vitest run --coverage --passWithNoTests"
  },
  "exports": {
    "./*": "./src/*.ts"
  },
  "dependencies": {
    "use-intl": "^4.14.9"
  },
  "devDependencies": {
    "@types/node": "^24.19.1",
    "@workspace/typescript-config": "workspace:*",
    "vitest": "^4.0.18"
  }
}
```

```json
// packages/i18n/tsconfig.json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "coverage"]
}
```

```ts
// packages/i18n/vitest.config.mts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts']
  }
})
```

Run: `pnpm install` (the workspace picks up the package). Then add it to consumers:

```bash
pnpm --dir packages/ui add @workspace/i18n@workspace:* use-intl@^4.14.9
pnpm --dir apps/web add @workspace/i18n@workspace:* next-intl@^4.14.9
pnpm --dir packages/auth add @workspace/i18n@workspace:*
pnpm --dir packages/email add @workspace/i18n@workspace:* use-intl@^4.14.9
pnpm --dir apps/desktop add @workspace/i18n@workspace:* use-intl@^4.14.9
```

Use `--dir`, not `--filter`: `apps/desktop` is named `saas-forge`, the same as the root package.

- [ ] **Step 2: Write the failing tests**

```ts
// packages/i18n/src/config.test.ts
import { describe, expect, it } from "vitest";
import { isLocale, parseAcceptLanguage, resolveLocale, toLocale } from "./config";

describe("locale config", () => {
  it("recognises supported locales only", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(toLocale(null)).toBeUndefined();
  });

  it("picks the first supported Accept-Language entry by quality, matching base languages", () => {
    expect(parseAcceptLanguage("fr-CA,fr;q=0.9,es-MX;q=0.8,en;q=0.5")).toBe("es");
    expect(parseAcceptLanguage("en;q=0.2, es;q=0.9")).toBe("es");
    expect(parseAcceptLanguage("de, *;q=0.1")).toBeUndefined();
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
  });

  it("resolves user, then cookie, then header, then site default, then en", () => {
    const all = { userLocale: "es", cookie: "en", acceptLanguage: "en", siteDefault: "en" };
    expect(resolveLocale(all)).toBe("es");
    expect(resolveLocale({ ...all, userLocale: null, cookie: "es" })).toBe("es");
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "es-ES" })).toBe("es");
    expect(resolveLocale({ acceptLanguage: "de", siteDefault: "es" })).toBe("es");
    expect(resolveLocale({ siteDefault: "klingon" })).toBe("en");
  });
});
```

```ts
// packages/i18n/src/format.test.ts
import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatNumber, formatRelative } from "./format";

const date = new Date(2026, 2, 5, 12); // 5 March 2026, local time

describe("formatters", () => {
  it("keeps today's English output when no locale is passed", () => {
    expect(formatDate(date)).toBe("March 5, 2026");
    expect(formatCurrency(1234, "USD")).toBe("$12.34");
  });

  it("formats in Spanish", () => {
    expect(formatDate(date, "es")).toBe("5 de marzo de 2026");
    expect(formatNumber(1234.5, "es")).toBe("1234,5");
    expect(formatCurrency(1234, "USD", "es")).toContain("12,34");
  });

  it("formats relative time against a fixed now", () => {
    const now = new Date(2026, 2, 8, 12);
    expect(formatRelative(date, "en", now)).toBe("3 days ago");
    expect(formatRelative(date, "es", now)).toBe("hace 3 días");
  });
});
```

```ts
// packages/i18n/src/messages.test.ts
import { describe, expect, it } from "vitest";
import { getMessages } from "./messages";

describe("getMessages", () => {
  it("returns Spanish over an English base", () => {
    expect(getMessages("es").common.language).toBe("Idioma");
    expect(getMessages("en").common.language).toBe("Language");
  });

  it("returns the same object on repeat calls", () => {
    expect(getMessages("es")).toBe(getMessages("es"));
  });
});
```

`formatNumber(1234.5, "es")` is `"1234,5"` because Spanish CLDR does not group four-digit numbers. If Node's ICU prints `"1.234,5"`, update the expectation to what `new Intl.NumberFormat("es").format(1234.5)` returns on Node 24. Do not hardcode a different separator logic.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --dir packages/i18n exec vitest run`
Expected: FAIL, modules `./config`, `./format`, `./messages` not found.

- [ ] **Step 4: Write `config.ts`**

```ts
// packages/i18n/src/config.ts
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** next-intl's conventional cookie name; holds the visitor's last choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale | undefined {
  return isLocale(value) ? value : undefined;
}

/** The best supported locale in an Accept-Language header ("es-MX" counts as "es"). */
export function parseAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.toLowerCase().split("-")[0], quality: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map((entry) => toLocale(entry.base)).find(Boolean);
}

export function resolveLocale(input: {
  userLocale?: unknown;
  cookie?: unknown;
  acceptLanguage?: string | null;
  siteDefault?: unknown;
}): Locale {
  return (
    toLocale(input.userLocale) ??
    toLocale(input.cookie) ??
    parseAcceptLanguage(input.acceptLanguage) ??
    toLocale(input.siteDefault) ??
    DEFAULT_LOCALE
  );
}
```

- [ ] **Step 5: Write `format.ts`**

```ts
// packages/i18n/src/format.ts
import { DEFAULT_LOCALE, type Locale } from "./config";

type DateInput = Date | string | number;

export function formatDate(date: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

export function formatDateTime(date: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

export function formatRelative(date: DateInput, locale: Locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  const seconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
  const [unit, size] = RELATIVE_UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Amounts are stored in minor units (cents). */
export function formatCurrency(amountMinor: number, currency: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}
```

- [ ] **Step 6: Write the first catalogue and `messages.ts`**

```json
// packages/i18n/src/messages/en/common.json
{
  "language": "Language",
  "locales": { "en": "English", "es": "Español" },
  "languageSaveFailed": "Could not save your language. Please try again.",
  "loading": { "title": "Loading", "description": "Please wait while we are loading the page!" },
  "retrieving": { "title": "Retrieving", "description": "Please wait while we retrieve the data." },
  "retrieveError": { "title": "Error Retrieving Data", "description": "There was an error while retrieving the data." },
  "somethingWentWrong": "Something went wrong!",
  "guestBanner": "You're in a read-only demo. Changes are disabled."
}
```

```json
// packages/i18n/src/messages/es/common.json
{
  "language": "Idioma",
  "locales": { "en": "English", "es": "Español" },
  "languageSaveFailed": "No se pudo guardar tu idioma. Inténtalo de nuevo.",
  "loading": { "title": "Cargando", "description": "¡Espera mientras cargamos la página!" },
  "retrieving": { "title": "Obteniendo datos", "description": "Espera mientras obtenemos los datos." },
  "retrieveError": { "title": "Error al obtener los datos", "description": "Se produjo un error al obtener los datos." },
  "somethingWentWrong": "¡Algo salió mal!",
  "guestBanner": "Estás en una demo de solo lectura. Los cambios están desactivados."
}
```

```ts
// packages/i18n/src/messages/en/index.ts
import common from "./common.json";

/** English is the source catalogue; its shape is the `Messages` type. */
const messages = {
  common,
};

export default messages;
```

```ts
// packages/i18n/src/messages/es/index.ts
import common from "./common.json";

const messages = {
  common,
};

export default messages;
```

```ts
// packages/i18n/src/messages.ts
import type { Locale } from "./config";
import en from "./messages/en/index";
import es from "./messages/es/index";

export type Messages = typeof en;

declare module "use-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}

const catalogues: Record<Locale, unknown> = { en, es };
const cache = new Map<Locale, Messages>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeOver(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    merged[key] = isRecord(current) && isRecord(value) ? mergeOver(current, value) : value;
  }
  return merged;
}

/** A locale's catalogue over English, so a missing translation shows English, never a key. */
export function getMessages(locale: Locale): Messages {
  let messages = cache.get(locale);
  if (!messages) {
    messages = (locale === "en" ? en : mergeOver(en, catalogues[locale] as Record<string, unknown>)) as Messages;
    cache.set(locale, messages);
  }
  return messages;
}
```

The `declare module "use-intl"` block lives in `messages.ts` because every consumer imports `getMessages`, which loads the augmentation into its TypeScript program. next-intl re-exports use-intl's `AppConfig`, so this one block types both libraries.

- [ ] **Step 7: Write `errors.ts` and `cookie.ts`**

```ts
// packages/i18n/src/errors.ts
const reported = new Set<string>();

/**
 * use-intl error handler. Tests fail on any i18n error; elsewhere each
 * distinct error is logged once (the English fallback still renders).
 */
export function onIntlError(error: Error): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") throw error;
  if (reported.has(error.message)) return;
  reported.add(error.message);
  console.error(error);
}
```

```ts
// packages/i18n/src/cookie.ts
import { LOCALE_COOKIE, type Locale } from "./config";

/** Remembers a visitor's language for a year (browser only). */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
```

- [ ] **Step 8: Re-export the old formatters**

```ts
// packages/ui/src/lib/utils/formatDate.ts  and  apps/web/lib/utils/formatDate.ts
export { formatDate } from "@workspace/i18n/format";
```

```ts
// packages/ui/src/lib/utils/formatAmount.ts
import { formatCurrency } from "@workspace/i18n/format";
import type { Locale } from "@workspace/i18n/config";

export function formatAmount(amount: number, currency: string = "USD", locale?: Locale) {
  return formatCurrency(amount, currency, locale);
}
```

```ts
// apps/web/lib/utils/formatAmount.ts
import { formatCurrency } from "@workspace/i18n/format";
import type { Locale } from "@workspace/i18n/config";

export function formatAmount(amount: number, currency: string, locale?: Locale) {
  return formatCurrency(amount, currency, locale);
}
```

Add `"@workspace/i18n"` to `transpilePackages` in `apps/web/next.config.mjs`, after `"@workspace/email"`.

- [ ] **Step 9: Run tests, typecheck, and check for a single `use-intl`**

Run:
```bash
pnpm --dir packages/i18n exec vitest run
pnpm --dir packages/i18n typecheck && pnpm --dir packages/ui typecheck && pnpm --dir apps/web typecheck
find . -path ./node_modules/.pnpm -prune -o -name package.json -path "*node_modules/use-intl/package.json" -print | grep -v "^./templates\|^./.generated"
```
Expected: tests PASS, typecheck PASS, and the `find` prints exactly `./node_modules/use-intl/package.json`. If it prints a second copy (for example `node_modules/next-intl/node_modules/use-intl`), align versions so pnpm hoists one: set every `use-intl` range to the version next-intl depends on (`npm view next-intl@<installed> dependencies.use-intl`), then `pnpm install`.

- [ ] **Step 10: Commit**

```bash
pnpm arch:check
pnpm template:sync && pnpm template:check-sync
git add packages/i18n packages/ui packages/auth/package.json packages/email/package.json apps/web apps/desktop/package.json pnpm-lock.yaml templates/saas-boilerplate
git commit -m "feat(i18n): add @workspace/i18n with locale resolution, formatters and catalogues

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Catalogue checks (`pnpm i18n:check`)

**Files:**
- Create: `packages/i18n/src/catalogue.ts`
- Create: `packages/i18n/src/catalogue.test.ts`
- Modify: `packages/i18n/package.json` (dependency `@formatjs/icu-messageformat-parser`)
- Modify: root `package.json` (script `i18n:check`)

**Interfaces:**
- Consumes: `LOCALES`, `DEFAULT_LOCALE` from Task 2.
- Produces: `checkCatalogues(source: Catalogue, others: Record<string, Catalogue>): CatalogueProblem[]`, where `Catalogue = Record<string, unknown>` (namespace → messages) and `CatalogueProblem = { locale: string; key: string; problem: "missing" | "extra" | "invalid" | "arguments"; detail?: string }`; `readCatalogue(dir: string): Catalogue`.

- [ ] **Step 1: Add the parser**

Run: `pnpm --filter @workspace/i18n add @formatjs/icu-messageformat-parser`

- [ ] **Step 2: Write the failing test**

```ts
// packages/i18n/src/catalogue.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkCatalogues, messageArguments, readCatalogue } from "./catalogue";
import { DEFAULT_LOCALE, LOCALES } from "./config";
import en from "./messages/en/index";
import es from "./messages/es/index";

const messagesDir = path.join(__dirname, "messages");

describe("checkCatalogues", () => {
  const source = { ns: { a: "Hi {name}", b: "<b>Bold</b> {count, plural, one {# day} other {# days}}" } };

  it("accepts a matching catalogue", () => {
    expect(checkCatalogues(source, { es: { ns: { a: "Hola {name}", b: "<b>Negrita</b> {count, plural, one {# día} other {# días}}" } } })).toEqual([]);
  });

  it("reports missing, extra, unparsable and mismatched-argument messages", () => {
    const problems = checkCatalogues(source, { es: { ns: { a: "Hola {nombre}", c: "x", b: "{count, plural, one {# día}" } } });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ locale: "es", key: "ns.a", problem: "arguments" }),
        expect.objectContaining({ locale: "es", key: "ns.b", problem: "invalid" }),
        expect.objectContaining({ locale: "es", key: "ns.c", problem: "extra" }),
      ]),
    );
  });

  it("reports a namespace missing in a locale", () => {
    expect(checkCatalogues({ ns: { a: "A" }, other: { b: "B" } }, { es: { ns: { a: "A" } } })).toEqual([
      expect.objectContaining({ locale: "es", key: "other.b", problem: "missing" }),
    ]);
  });

  it("lists placeholder, plural and tag names", () => {
    expect(messageArguments("<terms>x</terms> {a} {n, plural, other {{b}}}")).toEqual(["a", "b", "n", "terms"]);
  });

  it("flags an apostrophe that swallows a placeholder", () => {
    expect(checkCatalogues({ ns: { a: "Type “{phrase}”" } }, { es: { ns: { a: "Escribe '{phrase}'" } } })).toEqual([
      expect.objectContaining({ key: "ns.a", problem: "arguments" }),
    ]);
  });
});

describe("the shipped catalogues", () => {
  it("have every key English has, and only those, in every locale", () => {
    const source = readCatalogue(path.join(messagesDir, DEFAULT_LOCALE));
    const others = Object.fromEntries(
      LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, readCatalogue(path.join(messagesDir, l))]),
    );
    expect(checkCatalogues(source, others)).toEqual([]);
  });

  it("import every namespace file in each locale barrel", () => {
    const files = (locale: string) =>
      fs.readdirSync(path.join(messagesDir, locale)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
    expect(Object.keys(en).sort()).toEqual(files("en"));
    expect(Object.keys(es).sort()).toEqual(files("es"));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --dir packages/i18n exec vitest run src/catalogue.test.ts`
Expected: FAIL, `./catalogue` not found.

- [ ] **Step 4: Write `catalogue.ts`**

```ts
// packages/i18n/src/catalogue.ts
import fs from "node:fs";
import path from "node:path";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

export type Catalogue = Record<string, unknown>;
export type CatalogueProblem = {
  locale: string;
  key: string;
  problem: "missing" | "extra" | "invalid" | "arguments";
  detail?: string;
};

/** namespace/file name -> parsed JSON, for one locale directory. */
export function readCatalogue(dir: string): Catalogue {
  return Object.fromEntries(
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => [file.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"))]),
  );
}

export function flattenMessages(value: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof value === "string") {
    out.set(prefix, value);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) flattenMessages(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function collectArguments(elements: MessageFormatElement[], names: Set<string>): void {
  for (const element of elements) {
    if (element.type === TYPE.argument || element.type === TYPE.number || element.type === TYPE.date || element.type === TYPE.time) {
      names.add(element.value);
    } else if (element.type === TYPE.plural || element.type === TYPE.select) {
      names.add(element.value);
      for (const option of Object.values(element.options)) collectArguments(option.value, names);
    } else if (element.type === TYPE.tag) {
      names.add(element.value);
      collectArguments(element.children, names);
    }
  }
}

/** Sorted placeholder, plural/select and rich-text tag names a message uses. */
export function messageArguments(message: string): string[] {
  const names = new Set<string>();
  collectArguments(parse(message), names);
  return [...names].sort();
}

function tryArguments(message: string): string[] | Error {
  try {
    return messageArguments(message);
  } catch (error) {
    return error as Error;
  }
}

/** Every locale must have exactly the source's keys, valid ICU, and the same arguments. */
export function checkCatalogues(source: Catalogue, others: Record<string, Catalogue>): CatalogueProblem[] {
  const problems: CatalogueProblem[] = [];
  const sourceMessages = flattenMessages(source);
  for (const [locale, catalogue] of Object.entries(others)) {
    const messages = flattenMessages(catalogue);
    for (const [key, sourceMessage] of sourceMessages) {
      const message = messages.get(key);
      if (message === undefined) {
        problems.push({ locale, key, problem: "missing" });
        continue;
      }
      const args = tryArguments(message);
      if (args instanceof Error) {
        problems.push({ locale, key, problem: "invalid", detail: args.message });
        continue;
      }
      const expected = tryArguments(sourceMessage);
      if (expected instanceof Error) {
        problems.push({ locale: "source", key, problem: "invalid", detail: expected.message });
      } else if (expected.join() !== args.join()) {
        problems.push({ locale, key, problem: "arguments", detail: `expected [${expected}] got [${args}]` });
      }
    }
    for (const key of messages.keys()) {
      if (!sourceMessages.has(key)) problems.push({ locale, key, problem: "extra" });
    }
  }
  return problems;
}
```

Add to root `package.json` scripts, after `"test:coverage"`:

```json
"i18n:check": "pnpm --dir packages/i18n exec vitest run src/catalogue.test.ts",
```

CI already runs it: the Test job runs `turbo run test`, which includes `packages/i18n`.

- [ ] **Step 5: Run and commit**

Run: `pnpm i18n:check && pnpm --dir packages/i18n typecheck`
Expected: PASS.

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/i18n package.json pnpm-lock.yaml templates/saas-boilerplate
git commit -m "feat(i18n): check catalogues for missing keys, bad ICU and argument drift

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Persist `User.locale`

**Files:**
- Modify: `packages/database/prisma/user.prisma` (model `User`)
- Modify: `packages/auth/src/better-auth/user-fields.ts`
- Modify: `packages/auth/src/better-auth/user-fields.test.ts`

**Interfaces:**
- Consumes: `userAdditionalFields` (Task 1), `LOCALES` (Task 2).
- Produces: `session.user.locale: string | null | undefined`; `authClient.updateUser({ locale })` accepts only `en`, `es` or `null`.

- [ ] **Step 1: Write the failing tests** (append to `user-fields.test.ts`)

```ts
describe("locale", () => {
  it("accepts a supported locale from update-user and sign-up", () => {
    expect(parseUserInput(options, { locale: "es" }, "update")).toEqual({ locale: "es" });
    expect(parseUserInput(options, { locale: "en" }, "create")).toMatchObject({ locale: "en" });
  });

  it("rejects an unsupported locale", () => {
    expect(() => parseUserInput(options, { locale: "xx" }, "update")).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --dir packages/auth exec vitest run src/better-auth/user-fields.test.ts`
Expected: FAIL. `locale` is not a known field, so it is dropped (`{}`), not accepted.

- [ ] **Step 3: Implement**

```prisma
// packages/database/prisma/user.prisma, in model User, after `image     String?`
    locale    String?
```

```ts
// packages/auth/src/better-auth/user-fields.ts
import type { BetterAuthOptions } from "better-auth";
import { z } from "zod";
import { LOCALES } from "@workspace/i18n/config";

type AdditionalUserFields = NonNullable<NonNullable<BetterAuthOptions["user"]>["additionalFields"]>;

/**
 * Extra user columns Better Auth reads and returns in the session. Only
 * fields with `input: true` may come from sign-up or update-user bodies;
 * credit balances change through Prisma on the server only.
 */
export const userAdditionalFields = {
  creditsUsed: { type: "number", required: false, input: false },
  creditsTotal: { type: "number", required: false, input: false },
  // The user's language. Written through updateUser so Better Auth also
  // refreshes the cached session cookie.
  locale: { type: "string", required: false, input: true, validator: { input: z.enum(LOCALES).nullable() } },
} satisfies AdditionalUserFields;
```

Run: `pnpm generate`. This only regenerates the Prisma client; it does not touch the database.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --dir packages/auth exec vitest run && pnpm --dir packages/database exec prisma validate && pnpm --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit** (no migration file; the owner runs `pnpm migrate`)

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/database/prisma/user.prisma packages/auth templates/saas-boilerplate
git commit -m "feat(i18n): store the user's locale through Better Auth

Needs a migration: the owner runs pnpm migrate (adds nullable User.locale).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Web runtime (request config, root layout, site setting)

**Files:**
- Create: `apps/web/i18n/request.ts`
- Create: `apps/web/i18n/__tests__/request.test.ts`
- Create: `apps/web/components/i18n/IntlClientProvider.tsx`
- Modify: `apps/web/next.config.mjs` (wrap with the next-intl plugin)
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/lib/site-config/registry.ts` (new setting)
- Modify: `apps/web/.env.example` (`NEXT_PUBLIC_DEFAULT_LOCALE`)

**Interfaces:**
- Consumes: `resolveLocale`, `LOCALE_COOKIE`, `getMessages`, `onIntlError` (Task 2); `session.user.locale` (Task 4); `getSiteConfig()` from `@/lib/site-config/service`.
- Produces: `getLocale()` / `getTranslations()` from `next-intl/server` work in every server component and route; client components under the root layout can call `useTranslations`, `useLocale` from `use-intl` or `next-intl`; site setting `"i18n.defaultLocale"`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/i18n/__tests__/request.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  acceptLanguage: null as string | null,
  session: null as unknown,
  siteDefault: "en",
}));

vi.mock("next-intl/server", () => ({ getRequestConfig: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.acceptLanguage ? { "accept-language": state.acceptLanguage } : {}),
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }),
}));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: async () => (state.session instanceof Error ? Promise.reject(state.session) : state.session) } },
}));
vi.mock("@/lib/site-config/service", () => ({ getSiteConfig: async () => ({ "i18n.defaultLocale": state.siteDefault }) }));

import requestConfig from "../request";
const run = requestConfig as unknown as () => Promise<{ locale: string; messages: { common: { language: string } } }>;

beforeEach(() => Object.assign(state, { cookie: undefined, acceptLanguage: null, session: null, siteDefault: "en" }));

describe("i18n request config", () => {
  it("prefers the signed-in user's locale over the cookie", async () => {
    state.session = { user: { id: "u1", locale: "es" } };
    state.cookie = "en";
    expect((await run()).locale).toBe("es");
  });

  it("uses the cookie, then the browser language, then the site default", async () => {
    state.cookie = "es";
    expect((await run()).locale).toBe("es");
    state.cookie = undefined;
    state.acceptLanguage = "es-AR,es;q=0.9";
    expect((await run()).locale).toBe("es");
    state.acceptLanguage = "de";
    state.siteDefault = "es";
    expect((await run()).locale).toBe("es");
  });

  it("falls back to the cookie when the session lookup fails", async () => {
    state.session = new Error("db down");
    state.cookie = "es";
    const config = await run();
    expect(config.locale).toBe("es");
    expect(config.messages.common.language).toBe("Idioma");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --dir apps/web exec vitest run i18n/__tests__/request.test.ts`
Expected: FAIL, `../request` not found.

- [ ] **Step 3: Implement request config, plugin and site setting**

```ts
// apps/web/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { auth } from "@workspace/auth/better-auth/auth";
import { LOCALE_COOKIE, resolveLocale } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";
import { getSiteConfig } from "@/lib/site-config/service";

// No URL prefix: the language comes from the user, their cookie, their
// browser, then the site default (admin-editable in /admin/settings).
export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const [session, cookieStore, config] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }).catch(() => null),
    cookies(),
    getSiteConfig(),
  ]);
  const locale = resolveLocale({
    userLocale: session?.user?.locale,
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
    siteDefault: config["i18n.defaultLocale"],
  });
  return { locale, messages: getMessages(locale), onError: onIntlError };
});
```

In `apps/web/next.config.mjs`, add at the top and change the export:

```js
import createNextIntlPlugin from "next-intl/plugin"
// …
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
```

In `apps/web/lib/site-config/registry.ts`, import `import { DEFAULT_LOCALE, LOCALES } from "@workspace/i18n/config";` and add after `"registration.mode"` (outside any module markers):

```ts
  "i18n.defaultLocale": setting({
    group: "Localization",
    label: "Default language",
    description: "For visitors with no saved choice whose browser languages are not supported.",
    public: true,
    schema: z.enum(LOCALES),
    env: "NEXT_PUBLIC_DEFAULT_LOCALE",
    default: DEFAULT_LOCALE,
  }),
```

In `apps/web/.env.example`, under the theme/site variables:

```bash
# Language for visitors whose browser languages are not supported (en, es). Admins can change it in /admin/settings.
NEXT_PUBLIC_DEFAULT_LOCALE="en"
```

- [ ] **Step 4: Root layout and client provider**

```tsx
// apps/web/components/i18n/IntlClientProvider.tsx
"use client";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import type { Locale } from "@workspace/i18n/config";
import type { Messages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";

// Functions cannot cross the server/client boundary, so onError is set here.
export function IntlClientProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} onError={onIntlError}>
      {children}
    </NextIntlClientProvider>
  );
}
```

In `apps/web/app/layout.tsx`:

```tsx
import { getLocale } from "next-intl/server";
import { getMessages } from "@workspace/i18n/messages";
import { IntlClientProvider } from "@/components/i18n/IntlClientProvider";
// …
  const [config, flags, locale] = await Promise.all([getPublicSiteConfig(), evaluateFlagsForRequest(), getLocale()]);
// …
    <html lang={locale} suppressHydrationWarning className={`theme-${config["branding.theme"]}`}>
      <body className={…}>
        <IntlClientProvider locale={locale} messages={getMessages(locale)}>
          <TRPCReactProvider>
            {/* existing tree unchanged */}
          </TRPCReactProvider>
        </IntlClientProvider>
      </body>
```

`getLocale()` returns `string`; narrow it with `toLocale(await getLocale()) ?? DEFAULT_LOCALE` if typecheck needs a `Locale`.

- [ ] **Step 5: Run tests, typecheck, build smoke**

Run:
```bash
pnpm --dir apps/web exec vitest run i18n
pnpm --dir apps/web typecheck
pnpm --dir apps/web test
```
Expected: PASS. If a site-config test snapshots the setting list, update it to include `i18n.defaultLocale`.

- [ ] **Step 6: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add apps/web templates/saas-boilerplate
git commit -m "feat(i18n): resolve the locale per request on web with next-intl

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Shared UI plumbing (test helper, LocaleSwitcher, desktop provider)

**Files:**
- Create: `packages/ui/src/test/intl.tsx`
- Create: `packages/ui/src/components/misc/LocaleSwitcher.tsx`
- Create: `packages/ui/src/components/misc/LocaleSwitcher.test.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `getMessages`, `onIntlError`, `LOCALES`, `Locale` (Task 2).
- Produces:
  - `renderWithIntl(ui: ReactElement, options?: { locale?: Locale } & RenderOptions): RenderResult` (Testing Library `render` inside `IntlProvider`)
  - `<LocaleSwitcher value={Locale} onChange={(l: Locale) => void} disabled? className? id? />`: a native `<select>` labelled with `common.language`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/components/misc/LocaleSwitcher.test.tsx
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "../../test/intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("lists every locale by its own name and reports the choice", () => {
    const onChange = vi.fn();
    renderWithIntl(<LocaleSwitcher value="en" onChange={onChange} />);
    const select = screen.getByLabelText("Language");
    expect(screen.getByRole("option", { name: "Español" })).toBeTruthy();
    fireEvent.change(select, { target: { value: "es" } });
    expect(onChange).toHaveBeenCalledWith("es");
  });

  it("labels itself in the active language", () => {
    renderWithIntl(<LocaleSwitcher value="es" onChange={() => {}} />, { locale: "es" });
    expect(screen.getByLabelText("Idioma")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --dir packages/ui exec vitest run src/components/misc/LocaleSwitcher.test.tsx`
Expected: FAIL, `../../test/intl` not found.

- [ ] **Step 3: Implement**

```tsx
// packages/ui/src/test/intl.tsx
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { IntlProvider } from "use-intl";
import { DEFAULT_LOCALE, type Locale } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";

/** Renders inside an IntlProvider, as the apps do. Missing keys throw in tests. */
export function renderWithIntl(ui: ReactElement, { locale = DEFAULT_LOCALE, ...options }: { locale?: Locale } & RenderOptions = {}): RenderResult {
  return render(
    <IntlProvider locale={locale} messages={getMessages(locale)} onError={onIntlError}>
      {ui}
    </IntlProvider>,
    options,
  );
}
```

```tsx
// packages/ui/src/components/misc/LocaleSwitcher.tsx
"use client";
import { useTranslations } from "use-intl";
import { LOCALES, type Locale } from "@workspace/i18n/config";
import { cn } from "@workspace/ui/lib/utils";

export interface LocaleSwitcherProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function LocaleSwitcher({ value, onChange, disabled, className, id = "locale-switcher" }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  return (
    <>
      <label htmlFor={id} className="sr-only">{t("language")}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Locale)}
        className={cn("min-h-10 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring", className)}
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>{t(`locales.${locale}`)}</option>
        ))}
      </select>
    </>
  );
}
```

In `apps/desktop/src/renderer/src/App.tsx`, wrap the tree:

```tsx
import { IntlProvider } from "use-intl";
import { DEFAULT_LOCALE } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";
import { onIntlError } from "@workspace/i18n/errors";
// …
  return (
    <IntlProvider locale={DEFAULT_LOCALE} messages={getMessages(DEFAULT_LOCALE)} onError={onIntlError}>
      <ThemeProvider defaultTheme={themeType}>
        {/* unchanged */}
      </ThemeProvider>
    </IntlProvider>
  );
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --dir packages/ui exec vitest run src/components/misc && pnpm --dir packages/ui typecheck && pnpm --dir apps/desktop typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/ui apps/desktop templates/saas-boilerplate
git commit -m "feat(i18n): add LocaleSwitcher, renderWithIntl and an English provider on desktop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Auth surfaces

**Files:**
- Create: `packages/i18n/src/messages/{en,es}/auth.json`; modify both `index.ts` barrels (add `import auth from "./auth.json";` and `auth,`)
- Modify: `packages/auth/src/utils/zod.ts` (schema factory)
- Create: `packages/ui/src/hooks/useAuthSchemas.tsx`
- Modify: `packages/ui/src/components/auth/{LoginCard,RegisterCard,ForgotPasswordCard,ResetPasswordCard,VerificationCard,ErrorCard,LoadingCard,Quote}.tsx`
- Modify: `apps/web/app/(auth)/{sign-in,sign-up}/layout.tsx`, `(auth)/sign-up/page.tsx`, `(auth)/reset-password/page.tsx`, `(auth)/forgot-password/page.tsx`, `(auth)/auth-callback/page.tsx`, `(auth)/email-verified/page.tsx`
- Create: `packages/ui/src/components/auth/auth-i18n.test.tsx`
- Test: `packages/auth/src/utils/zod.test.ts` (must still pass unchanged)

**Interfaces:**
- Consumes: `renderWithIntl` (Task 6).
- Produces: `createAuthSchemas(messages?: AuthValidationMessages)`, which returns `{ LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema, ResetPasswordSettingsSchema, AddPasswordSchema }`; `type AuthValidationMessages`; `DEFAULT_AUTH_VALIDATION_MESSAGES`; `useAuthSchemas()` returns the same object with translated messages. Existing named schema exports keep their exact English messages (desktop and mobile use them).

- [ ] **Step 1: Add the `auth` catalogues**

```json
// packages/i18n/src/messages/en/auth.json
{
  "orContinueWith": "Or continue with",
  "backToLogin": "Back to Login",
  "email": "Email",
  "password": "Password",
  "confirmPassword": "Confirm Password",
  "login": {
    "title": "Login",
    "subtitle": "Welcome back! Please enter your details.",
    "forgotPassword": "Forgot password?",
    "submit": "Sign in",
    "noAccount": "Don't have an account?",
    "signUp": "Sign up",
    "withProvider": "Sign in with {provider}"
  },
  "register": {
    "title": "Create an account",
    "subtitle": "Enter your information to get started",
    "name": "Name",
    "namePlaceholder": "Enter your name",
    "emailPlaceholder": "Enter your email",
    "passwordPlaceholder": "Enter your password",
    "submit": "Create Account",
    "success": "Registration successful! Please verify your email before logging in!",
    "haveAccount": "Already have an account?",
    "logIn": "Log in",
    "terms": "By clicking continue, you agree to our <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>.",
    "withProvider": "Sign up with {provider}",
    "inviteOnly": "Sign-ups are invite-only. Please use your invitation link.",
    "accountNotLinked": "This email is already in use with another provider."
  },
  "forgot": {
    "title": "Forgot Password",
    "subtitle": "Enter your email to reset your password",
    "submit": "Send Reset Link",
    "sent": "Check your email for the reset link"
  },
  "reset": {
    "title": "Reset Password",
    "subtitle": "Enter your new password below",
    "newPassword": "New Password",
    "submit": "Reset Password",
    "success": "Password reset successfully"
  },
  "verification": {
    "title": "Verification",
    "subtitle": "Verifying your identity...",
    "verified": "Email Verified",
    "notVerified": "Email Not Verified"
  },
  "error": { "title": "Error", "fallback": "Oops! Something went wrong!" },
  "callbackFailed": "Failed to verify session",
  "quote": {
    "text": "The real competitive advantage is not ideas — it’s speed of execution",
    "author": "Reid Hoffman",
    "credential": "Co-founder of LinkedIn"
  },
  "validation": {
    "emailRequired": "Email is required",
    "emailInvalid": "Invalid email address",
    "nameRequired": "Name is required",
    "nameMax": "Name must be less than 50 characters",
    "passwordRequired": "Password is required",
    "passwordMin": "Password must be at least 8 characters",
    "passwordMax": "Password must be less than 50 characters",
    "confirmPasswordRequired": "Please confirm your password",
    "confirmPasswordMin": "Password must be at least 8 characters",
    "confirmPasswordMax": "Password must be less than 50 characters",
    "passwordsMismatch": "Passwords do not match"
  },
  "meta": {
    "signInTitle": "Sign In",
    "signInDescription": "Sign in to your SaaS account.",
    "signUpTitle": "Sign Up",
    "signUpDescription": "Create your SaaS account."
  }
}
```

```json
// packages/i18n/src/messages/es/auth.json
{
  "orContinueWith": "O continúa con",
  "backToLogin": "Volver al inicio de sesión",
  "email": "Correo electrónico",
  "password": "Contraseña",
  "confirmPassword": "Confirmar contraseña",
  "login": {
    "title": "Iniciar sesión",
    "subtitle": "¡Te damos la bienvenida de nuevo! Introduce tus datos.",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "submit": "Iniciar sesión",
    "noAccount": "¿No tienes una cuenta?",
    "signUp": "Regístrate",
    "withProvider": "Iniciar sesión con {provider}"
  },
  "register": {
    "title": "Crear una cuenta",
    "subtitle": "Introduce tus datos para empezar",
    "name": "Nombre",
    "namePlaceholder": "Introduce tu nombre",
    "emailPlaceholder": "Introduce tu correo electrónico",
    "passwordPlaceholder": "Introduce tu contraseña",
    "submit": "Crear cuenta",
    "success": "¡Registro completado! Verifica tu correo electrónico antes de iniciar sesión.",
    "haveAccount": "¿Ya tienes una cuenta?",
    "logIn": "Inicia sesión",
    "terms": "Al continuar, aceptas nuestros <terms>Términos del servicio</terms> y nuestra <privacy>Política de privacidad</privacy>.",
    "withProvider": "Registrarse con {provider}",
    "inviteOnly": "El registro es solo por invitación. Usa tu enlace de invitación.",
    "accountNotLinked": "Este correo electrónico ya está en uso con otro proveedor."
  },
  "forgot": {
    "title": "Recuperar contraseña",
    "subtitle": "Introduce tu correo electrónico para restablecer tu contraseña",
    "submit": "Enviar enlace",
    "sent": "Revisa tu correo electrónico: te hemos enviado el enlace para restablecerla"
  },
  "reset": {
    "title": "Restablecer contraseña",
    "subtitle": "Introduce tu nueva contraseña",
    "newPassword": "Nueva contraseña",
    "submit": "Restablecer contraseña",
    "success": "Contraseña restablecida correctamente"
  },
  "verification": {
    "title": "Verificación",
    "subtitle": "Verificando tu identidad...",
    "verified": "Correo electrónico verificado",
    "notVerified": "Correo electrónico no verificado"
  },
  "error": { "title": "Error", "fallback": "¡Vaya! Algo salió mal." },
  "callbackFailed": "No se pudo verificar la sesión",
  "quote": {
    "text": "La verdadera ventaja competitiva no son las ideas, sino la velocidad de ejecución",
    "author": "Reid Hoffman",
    "credential": "Cofundador de LinkedIn"
  },
  "validation": {
    "emailRequired": "El correo electrónico es obligatorio",
    "emailInvalid": "Correo electrónico no válido",
    "nameRequired": "El nombre es obligatorio",
    "nameMax": "El nombre debe tener menos de 50 caracteres",
    "passwordRequired": "La contraseña es obligatoria",
    "passwordMin": "La contraseña debe tener al menos 8 caracteres",
    "passwordMax": "La contraseña debe tener menos de 50 caracteres",
    "confirmPasswordRequired": "Confirma tu contraseña",
    "confirmPasswordMin": "La contraseña debe tener al menos 8 caracteres",
    "confirmPasswordMax": "La contraseña debe tener menos de 50 caracteres",
    "passwordsMismatch": "Las contraseñas no coinciden"
  },
  "meta": {
    "signInTitle": "Iniciar sesión",
    "signInDescription": "Inicia sesión en tu cuenta.",
    "signUpTitle": "Registrarse",
    "signUpDescription": "Crea tu cuenta."
  }
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// packages/ui/src/components/auth/auth-i18n.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "../../test/intl";
import LoginCard from "./LoginCard";
import RegisterCard from "./RegisterCard";

const loginProps = {
  showEmail: true, showGoogleProvider: true, showGithubProvider: false, showLinkedinProvider: false,
  onEmailSubmit: vi.fn(), onGoogleProviderSubmit: vi.fn(), onGithubProviderSubmit: vi.fn(),
  onLinkedinProviderSubmit: vi.fn(), onSignUpClick: vi.fn(), onForgotPasswordClick: vi.fn(),
};

describe("auth cards", () => {
  it("render in Spanish", () => {
    renderWithIntl(<LoginCard {...loginProps} />, { locale: "es" });
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByText("¿Olvidaste tu contraseña?")).toBeTruthy();
    expect(screen.getByTitle("Iniciar sesión con Google")).toBeTruthy();
  });

  it("show validation errors in the active language", async () => {
    renderWithIntl(<LoginCard {...loginProps} />, { locale: "es" });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(screen.getByText("El correo electrónico es obligatorio")).toBeTruthy());
  });

  it("keep the terms links clickable inside the translated sentence", () => {
    const onTermsOfServiceClick = vi.fn();
    renderWithIntl(
      <RegisterCard {...loginProps} onSignInClick={vi.fn()} onTermsOfServiceClick={onTermsOfServiceClick} onPrivacyPolicyClick={vi.fn()} onEmailSubmit={vi.fn()} />,
      { locale: "es" },
    );
    fireEvent.click(screen.getByRole("button", { name: "Términos del servicio" }));
    expect(onTermsOfServiceClick).toHaveBeenCalled();
  });
});
```

`getByRole("button", { name: "Iniciar sesión" })` matches the submit button. If it also matches another element, use `getAllByRole(...).at(-1)`.

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --dir packages/ui exec vitest run src/components/auth/auth-i18n.test.tsx`
Expected: FAIL. The cards still render English ("Login").

- [ ] **Step 4: Schema factory** (`packages/auth/src/utils/zod.ts`, full replacement)

```ts
import * as z from 'zod';

export type AuthValidationMessages = {
    emailRequired: string;
    emailInvalid: string;
    nameRequired: string;
    nameMax: string;
    passwordRequired: string;
    passwordMin: string;
    passwordMax: string;
    confirmPasswordRequired: string;
    confirmPasswordMin: string;
    confirmPasswordMax: string;
    passwordsMismatch: string;
};

// The messages desktop and mobile show today; web passes translated ones.
export const DEFAULT_AUTH_VALIDATION_MESSAGES: AuthValidationMessages = {
    emailRequired: "Email is required",
    emailInvalid: "Invalid email address",
    nameRequired: "Name is required",
    nameMax: "Name must be less than 50 characters",
    passwordRequired: "password is required",
    passwordMin: "password must be at least 8 characters",
    passwordMax: "password must be less than 50 characters",
    confirmPasswordRequired: "confirmPassword is required",
    confirmPasswordMin: "confirmPassword must be at least 8 characters",
    confirmPasswordMax: "confirmPassword must be less than 50 characters",
    passwordsMismatch: "Passwords do not match",
};

export function createAuthSchemas(m: AuthValidationMessages = DEFAULT_AUTH_VALIDATION_MESSAGES) {
    const password = () => z.string().min(1, m.passwordRequired).min(8, m.passwordMin).max(50, m.passwordMax);
    const confirmPassword = () =>
        z.string().min(1, m.confirmPasswordRequired).min(8, m.confirmPasswordMin).max(50, m.confirmPasswordMax);
    const email = () => z.string().min(1, m.emailRequired).email(m.emailInvalid);
    const name = () => z.string().nonempty(m.nameRequired).min(1, m.nameRequired).max(50, m.nameMax);
    const mismatch = { message: m.passwordsMismatch, path: ["confirmPassword"] };

    return {
        ResetPasswordSchema: z.object({ password: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.password === data.confirmPassword, mismatch),
        LoginSchema: z.object({ email: email(), password: password() }),
        ForgotPasswordSchema: z.object({ email: email() }),
        RegisterSchema: z.object({ name: name(), email: email(), password: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.password === data.confirmPassword, mismatch),
        ResetPasswordSettingsSchema: z.object({ currentPassword: password(), newPassword: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.newPassword === data.confirmPassword, mismatch),
        // Adding a password to a social-only account (no current password).
        AddPasswordSchema: z.object({ newPassword: password(), confirmPassword: confirmPassword() })
            .refine((data) => data.newPassword === data.confirmPassword, mismatch),
    };
}

export const {
    ResetPasswordSchema,
    LoginSchema,
    ForgotPasswordSchema,
    RegisterSchema,
    ResetPasswordSettingsSchema,
    AddPasswordSchema,
} = createAuthSchemas();
```

Run `pnpm --dir packages/auth exec vitest run src/utils/zod.test.ts`. It must pass unchanged, which proves desktop and mobile see the same messages.

```tsx
// packages/ui/src/hooks/useAuthSchemas.tsx
"use client";
import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { createAuthSchemas } from "@workspace/auth/utils/zod";

/** The auth form schemas with validation messages in the active language. */
export function useAuthSchemas() {
  const t = useTranslations("auth.validation");
  return useMemo(
    () =>
      createAuthSchemas({
        emailRequired: t("emailRequired"),
        emailInvalid: t("emailInvalid"),
        nameRequired: t("nameRequired"),
        nameMax: t("nameMax"),
        passwordRequired: t("passwordRequired"),
        passwordMin: t("passwordMin"),
        passwordMax: t("passwordMax"),
        confirmPasswordRequired: t("confirmPasswordRequired"),
        confirmPasswordMin: t("confirmPasswordMin"),
        confirmPasswordMax: t("confirmPasswordMax"),
        passwordsMismatch: t("passwordsMismatch"),
      }),
    [t],
  );
}
```

- [ ] **Step 5: Extract the auth cards**

Pattern, shown in full for `LoginCard.tsx` (the other cards follow the mapping table):

```tsx
import { useTranslations } from 'use-intl'
import { useAuthSchemas } from '@workspace/ui/hooks/useAuthSchemas'
// remove: import { LoginSchema } from '@workspace/auth/utils/zod';  (keep it as a type-only import if z.infer needs it)
// …
  const t = useTranslations('auth')
  const { LoginSchema } = useAuthSchemas()
  const form = useForm<z.infer<typeof LoginSchema>>({ resolver: zodResolver(LoginSchema), defaultValues: { email: '', password: '' } })
// …
        <h1 className='text-3xl font-bold tracking-tight text-center'>{t('login.title')}</h1>
        <p className='text-sm text-muted-foreground text-center'>{t('login.subtitle')}</p>
// labels: {t('email')}, {t('password')}; link: {t('login.forgotPassword')}; submit: {t('login.submit')}
// divider: {t('orContinueWith')}
// provider buttons: title={t('login.withProvider', { provider: 'Google' })}  (GitHub, LinkedIn likewise)
// footer: {t('login.noAccount')}{" "} … {t('login.signUp')}
```

| File | Literal | Replacement |
|---|---|---|
| `RegisterCard.tsx` | `RegisterSchema` import | `const { RegisterSchema } = useAuthSchemas()` |
| | "Create an account" / "Enter your information to get started" | `t('register.title')` / `t('register.subtitle')` |
| | label expression `field === 'confirmPassword' ? 'Confirm Password' : capitalised` | `{ name: t('register.name'), email: t('email'), password: t('password'), confirmPassword: t('confirmPassword') }[field]` |
| | placeholder `` `Enter your ${field}` `` / `'******'` | `{ name: t('register.namePlaceholder'), email: t('register.emailPlaceholder'), password: t('register.passwordPlaceholder'), confirmPassword: '******' }[field]` |
| | `setSuccess("Registration successful! …")` | `setSuccess(t('register.success'))` |
| | "Create Account", "Or continue with" | `t('register.submit')`, `t('orContinueWith')` |
| | `title="Sign up with Google"` (×3 providers) | `t('register.withProvider', { provider: 'Google' })` |
| | "Already have an account?" / "Log in" | `t('register.haveAccount')` / `t('register.logIn')` |
| | terms paragraph (text + two buttons) | `{t.rich('register.terms', { terms: (chunks) => <button onClick={onTermsOfServiceClick} className='underline underline-offset-4 hover:text-primary cursor-pointer'>{chunks}</button>, privacy: (chunks) => <button onClick={onPrivacyPolicyClick} className='underline underline-offset-4 hover:text-primary cursor-pointer'>{chunks}</button> })}` |
| `ForgotPasswordCard.tsx` | `ForgotPasswordSchema` import | `useAuthSchemas()` |
| | "Forgot Password" / "Enter your email to reset your password" | `t('forgot.title')` / `t('forgot.subtitle')` |
| | "Email", "Send Reset Link", "Back to Login" | `t('email')`, `t('forgot.submit')`, `t('backToLogin')` |
| `ResetPasswordCard.tsx` | `ResetPasswordSchema` import | `useAuthSchemas()` |
| | "Reset Password" (title), "Enter your new password below" | `t('reset.title')`, `t('reset.subtitle')` |
| | "New Password", "Confirm Password" | `t('reset.newPassword')`, `t('confirmPassword')` |
| | `toast.success("Password reset successfully")` | `toast.success(t('reset.success'))` |
| | "Reset Password" (button), "Back to Login" | `t('reset.submit')`, `t('backToLogin')` |
| `VerificationCard.tsx` | "Verification", "Verifying your identity...", "Back to Login" | `t('verification.title')`, `t('verification.subtitle')`, `t('backToLogin')` |
| `ErrorCard.tsx` | "Error", `"Oops! Something went wrong!"`, "Back to Login" | `t('error.title')`, `t('error.fallback')`, `t('backToLogin')` |
| `LoadingCard.tsx` | defaults `title="Loading"`, `description="Please wait…"` | make both optional with no default; inside: `const t = useTranslations('common')`, render `title ?? t('loading.title')`, `description ?? t('loading.description')` |
| `Quote.tsx` | the three `||` fallbacks | `quote?.quote || t('quote.text')`, `quote?.author || t('quote.author')`, `quote?.credential || t('quote.credential')` with `useTranslations('auth')` |

Web auth pages (`apps/web/app/(auth)`), each with `const t = useTranslations('auth')` from `next-intl`:

| File | Literal | Replacement |
|---|---|---|
| `sign-in/layout.tsx` | `title: "Sign In"`, `description: "Sign in to your SaaS account."` | `const t = await getTranslations('auth.meta')` (from `next-intl/server`), then `t('signInTitle')`, `t('signInDescription')` |
| `sign-up/layout.tsx` | `"Sign Up"`, `"Create your SaaS account."` | `t('signUpTitle')`, `t('signUpDescription')` |
| `sign-up/page.tsx` | `'This email is already in use with another provider.'` | `t('register.accountNotLinked')` |
| | `'Sign-ups are invite-only. …'` | `t('register.inviteOnly')` |
| | `authClient.signUp.email(data)` | `authClient.signUp.email({ ...data, locale: useLocale() })`. Call `const locale = useLocale()` at the top of `RegisterContent` and pass `locale`, so the verification email is in this language |
| `reset-password/page.tsx` | `setSuccess("Password reset successfully")`, `setError("Something went wrong!")` | `t('reset.success')`, `useTranslations('common')('somethingWentWrong')` |
| `forgot-password/page.tsx` | `"Check your email for the reset link"`, `"Something went wrong!"` | `t('forgot.sent')`, `common` `somethingWentWrong` |
| `auth-callback/page.tsx` | `setError("Failed to verify session")` | `t('callbackFailed')` |
| `email-verified/page.tsx` (client component) | `errorMessage={"Email Not Verified"}`, `successMessage={"Email Verified"}` | `t('verification.notVerified')`, `t('verification.verified')` |

Better Auth's own server error messages (`error.message` from sign-in and sign-up) stay English. That is a known gap, listed in the final report.

- [ ] **Step 6: Run tests and typecheck**

Run:
```bash
pnpm i18n:check
pnpm --dir packages/auth exec vitest run
pnpm --dir packages/ui exec vitest run
pnpm --dir packages/ui typecheck && pnpm --dir apps/web typecheck && pnpm --dir apps/desktop typecheck
```
Expected: PASS. Fix any existing `packages/ui` test that now renders an auth card without a provider by switching its `render(` to `renderWithIntl(`.

- [ ] **Step 7: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/i18n packages/auth packages/ui apps/web templates/saas-boilerplate
git commit -m "feat(i18n): translate auth pages, cards and validation messages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Shared app shell in `packages/ui` (settings, user menu, misc)

**Files:**
- Create: `packages/i18n/src/messages/{en,es}/settings.json`, `{en,es}/billing.json`, `{en,es}/api_keys.json`, `{en,es}/webhooks.json`
- Modify: both barrels (`settings` unmarked; `billing`, `api_keys`, `webhooks` each inside its module markers, in imports and in the object)
- Modify: `scaffold-modules/billing/manifest.json`, `scaffold-modules/api_keys/manifest.json`, `scaffold-modules/webhooks/manifest.json` (`unselected.remove` gains both locale files)
- Create: `packages/ui/src/components/home/LanguageSettings.tsx`
- Modify: `packages/ui/src/components/home/{SettingsDialog,SidebarUser,MyAccountSettings,SessionSettings,PlansBilling,ProgressWithCredits}.tsx`, `packages/ui/src/components/misc/GuestBanner.tsx`
- Modify tests: `packages/ui/src/components/home/MyAccountSettings.test.tsx`, `packages/ui/src/components/misc/GuestBanner.test.tsx`
- Create: `packages/ui/src/components/home/SettingsDialog.test.tsx`

**Interfaces:**
- Consumes: `LocaleSwitcher` (Task 6), `formatDateTime` (Task 2).
- Produces: `SettingsDialogProps.onLocaleChange?: (locale: Locale) => void | Promise<void>`. When set, a "Language & Region" tab shows a `LocaleSwitcher`. `SidebarUserProps` inherits it. `SettingsDialogProps.openedTab` now takes a tab id: `"account" | "sessions" | "language" | "billing" | "apiKeys" | "webhooks"`. No caller passes `openedTab` today.

- [ ] **Step 1: Catalogues**

```json
// packages/i18n/src/messages/en/settings.json
{
  "title": "Settings",
  "description": "Customize your settings here.",
  "sectionsLabel": "Account settings sections",
  "sectionSelect": "Settings section",
  "tabs": { "account": "My Account", "sessions": "Sessions", "language": "Language & Region" },
  "menu": { "settings": "Settings", "theme": "Theme", "light": "Light", "dark": "Dark", "system": "System", "logout": "Log out" },
  "account": {
    "title": "My Account",
    "description": "For modifying Email, you need to verify your new email address",
    "profilePicture": "Profile Picture",
    "upload": "Upload",
    "uploadHint": "Click the image to upload a new photo. Standard formats (JPG, PNG) are supported.",
    "username": "Username",
    "displayName": "Display Name",
    "update": "Update",
    "security": "Security",
    "securityDescription": "Manage your password and authentication methods.",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm Password",
    "showCurrent": "Show old password",
    "hideCurrent": "Hide old password",
    "showNew": "Show new password",
    "hideNew": "Hide new password",
    "showConfirm": "Show confirm password",
    "hideConfirm": "Hide confirm password",
    "updating": "Updating...",
    "updatePassword": "Update Password",
    "setPassword": "Set Password",
    "dangerZone": "Danger Zone",
    "dangerDescription": "Permanently delete your account and all associated data. This action cannot be undone.",
    "deletePhrase": "permanently delete",
    "deleteConfirmLabel": "Type “{phrase}” to confirm",
    "deleteConfirmError": "Please type “{phrase}” to confirm",
    "deleteAccount": "Delete Account",
    "guestCannotChangePassword": "Guest account cannot modify password",
    "guestCannotDelete": "Guest account cannot be deleted",
    "toast": {
      "error": "Error",
      "unauthorized": "Unauthorized",
      "sessionNotLoaded": "Session not loaded. Try again in a second.",
      "passwordAddFailed": "Failed to add password",
      "passwordAdded": "Password added successfully!",
      "passwordChanged": "Successfully modified password",
      "accountDeleted": "Successfully deleted Account",
      "nameUpdateFailed": "Unable to update name",
      "nameUpdated": "Successfully modified name",
      "uploadFailed": "Upload failed",
      "imageUpdated": "Successfully Updated Image",
      "avatarUnsupported": "Avatar update is not supported in this environment"
    }
  },
  "sessions": {
    "title": "Sessions",
    "description": "Manage your active sessions",
    "signOutOthers": "Sign out from all other devices",
    "device": "Device Info",
    "joined": "Date Joined",
    "lastActive": "Last Active",
    "action": "Action",
    "current": "Current",
    "unknown": "Unknown",
    "browser": "Browser",
    "ipHidden": "IP Hidden",
    "activeNow": "Active Now",
    "revoke": "Revoke"
  },
  "language": {
    "title": "Language & Region",
    "description": "Choose the language for menus, pages and emails."
  }
}
```

```json
// packages/i18n/src/messages/es/settings.json
{
  "title": "Configuración",
  "description": "Personaliza tu configuración aquí.",
  "sectionsLabel": "Secciones de la configuración de la cuenta",
  "sectionSelect": "Sección de configuración",
  "tabs": { "account": "Mi cuenta", "sessions": "Sesiones", "language": "Idioma y región" },
  "menu": { "settings": "Configuración", "theme": "Tema", "light": "Claro", "dark": "Oscuro", "system": "Sistema", "logout": "Cerrar sesión" },
  "account": {
    "title": "Mi cuenta",
    "description": "Para cambiar el correo electrónico, debes verificar tu nueva dirección",
    "profilePicture": "Foto de perfil",
    "upload": "Subir",
    "uploadHint": "Haz clic en la imagen para subir una foto nueva. Se admiten formatos estándar (JPG, PNG).",
    "username": "Nombre de usuario",
    "displayName": "Nombre visible",
    "update": "Actualizar",
    "security": "Seguridad",
    "securityDescription": "Gestiona tu contraseña y tus métodos de autenticación.",
    "currentPassword": "Contraseña actual",
    "newPassword": "Nueva contraseña",
    "confirmPassword": "Confirmar contraseña",
    "showCurrent": "Mostrar contraseña actual",
    "hideCurrent": "Ocultar contraseña actual",
    "showNew": "Mostrar nueva contraseña",
    "hideNew": "Ocultar nueva contraseña",
    "showConfirm": "Mostrar confirmación de contraseña",
    "hideConfirm": "Ocultar confirmación de contraseña",
    "updating": "Actualizando...",
    "updatePassword": "Actualizar contraseña",
    "setPassword": "Establecer contraseña",
    "dangerZone": "Zona de peligro",
    "dangerDescription": "Elimina de forma permanente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.",
    "deletePhrase": "eliminar permanentemente",
    "deleteConfirmLabel": "Escribe «{phrase}» para confirmar",
    "deleteConfirmError": "Escribe «{phrase}» para confirmar",
    "deleteAccount": "Eliminar cuenta",
    "guestCannotChangePassword": "La cuenta de invitado no puede cambiar la contraseña",
    "guestCannotDelete": "La cuenta de invitado no se puede eliminar",
    "toast": {
      "error": "Error",
      "unauthorized": "No autorizado",
      "sessionNotLoaded": "La sesión no se ha cargado. Inténtalo de nuevo en un momento.",
      "passwordAddFailed": "No se pudo añadir la contraseña",
      "passwordAdded": "¡Contraseña añadida correctamente!",
      "passwordChanged": "Contraseña modificada correctamente",
      "accountDeleted": "Cuenta eliminada correctamente",
      "nameUpdateFailed": "No se pudo actualizar el nombre",
      "nameUpdated": "Nombre modificado correctamente",
      "uploadFailed": "Error al subir el archivo",
      "imageUpdated": "Imagen actualizada correctamente",
      "avatarUnsupported": "No se puede actualizar el avatar en este entorno"
    }
  },
  "sessions": {
    "title": "Sesiones",
    "description": "Gestiona tus sesiones activas",
    "signOutOthers": "Cerrar sesión en todos los demás dispositivos",
    "device": "Dispositivo",
    "joined": "Fecha de inicio",
    "lastActive": "Última actividad",
    "action": "Acción",
    "current": "Actual",
    "unknown": "Desconocido",
    "browser": "Navegador",
    "ipHidden": "IP oculta",
    "activeNow": "Activa ahora",
    "revoke": "Revocar"
  },
  "language": {
    "title": "Idioma y región",
    "description": "Elige el idioma de los menús, las páginas y los correos electrónicos."
  }
}
```

```json
// en/billing.json
{ "settingsTab": "Plans & Billing", "title": "Billing", "description": "Manage your credits, and view transaction history.", "creditsUsed": "Credits Used", "nav": { "usage": "Usage" } }
// es/billing.json
{ "settingsTab": "Planes y facturación", "title": "Facturación", "description": "Gestiona tus créditos y consulta el historial de transacciones.", "creditsUsed": "Créditos usados", "nav": { "usage": "Uso" } }
// en/api_keys.json
{ "settingsTab": "API Keys", "unavailable": "API keys are not available in this context." }
// es/api_keys.json
{ "settingsTab": "Claves de API", "unavailable": "Las claves de API no están disponibles en este contexto." }
// en/webhooks.json
{ "settingsTab": "Webhooks", "unavailable": "Webhooks are not available in this context." }
// es/webhooks.json
{ "settingsTab": "Webhooks", "unavailable": "Los webhooks no están disponibles en este contexto." }
```

Barrel shape (en and es identical apart from the directory):

```ts
import auth from "./auth.json";
import common from "./common.json";
import settings from "./settings.json";
// scaffold:begin billing
import billing from "./billing.json";
// scaffold:end billing
// scaffold:begin api_keys
import api_keys from "./api_keys.json";
// scaffold:end api_keys
// scaffold:begin webhooks
import webhooks from "./webhooks.json";
// scaffold:end webhooks

const messages = {
  auth,
  common,
  settings,
  // scaffold:begin billing
  billing,
  // scaffold:end billing
  // scaffold:begin api_keys
  api_keys,
  // scaffold:end api_keys
  // scaffold:begin webhooks
  webhooks,
  // scaffold:end webhooks
};
```

In each of the three manifests, append to `unselected.remove`:

```json
"packages/i18n/src/messages/en/<module>.json",
"packages/i18n/src/messages/es/<module>.json"
```

- [ ] **Step 2: Write the failing tests**

```tsx
// packages/ui/src/components/home/SettingsDialog.test.tsx
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "../../test/intl";

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  authClient: { listAccounts: vi.fn().mockResolvedValue({ data: [] }), listSessions: vi.fn().mockResolvedValue({ data: [] }) },
  useSession: () => ({ data: { user: { name: "Ada", email: "ada@example.com" } } }),
}));

import { SettingsDialog } from "./SettingsDialog";

describe("SettingsDialog", () => {
  it("shows Spanish tab names and a language tab when the app can change language", async () => {
    const onLocaleChange = vi.fn();
    renderWithIntl(<SettingsDialog open onOpenChange={() => {}} onLocaleChange={onLocaleChange} />, { locale: "es" });
    const sectionSelect = screen.getByLabelText("Sección de configuración");
    expect(screen.getAllByText("Mi cuenta").length).toBeGreaterThan(0);
    fireEvent.change(sectionSelect, { target: { value: "language" } });
    fireEvent.change(await screen.findByLabelText("Idioma"), { target: { value: "en" } });
    expect(onLocaleChange).toHaveBeenCalledWith("en");
  });

  it("hides the language tab when no handler is given (desktop)", () => {
    renderWithIntl(<SettingsDialog open onOpenChange={() => {}} />);
    expect(screen.queryByRole("option", { name: "Language & Region" })).toBeNull();
  });
});
```

Add to `MyAccountSettings.test.tsx` (and change its existing `render(` to `renderWithIntl(`, imported as `../../test/intl`: `packages/ui` does not export `./test/*`, so tests use relative paths):

```tsx
  it("asks for the Spanish confirmation phrase in Spanish", async () => {
    mocks.listAccounts.mockResolvedValue({ data: [{ providerId: "credential" }] });
    renderWithIntl(<MyAccountSettings />, { locale: "es" });
    expect(screen.getByLabelText("Escribe «eliminar permanentemente» para confirmar")).toBeTruthy();
  });
```

The guest user in that test's mock can't delete anything, so only the label is asserted. The comparison change in Step 3 uses the same `deletePhrase` value.

In `GuestBanner.test.tsx`, switch `render(` to `renderWithIntl(` and add:

```tsx
  it("shows the notice in Spanish", () => {
    useSession.mockReturnValue({ data: { user: { role: "guest" } } });
    renderWithIntl(<GuestBanner />, { locale: "es" });
    expect(screen.getByText(/demo de solo lectura/)).toBeTruthy();
  });
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --dir packages/ui exec vitest run src/components/home src/components/misc`
Expected: FAIL. The Spanish texts are absent and `onLocaleChange` is not a prop yet.

- [ ] **Step 4: Implement**

`SettingsDialog.tsx`: move `data.nav` into the component as tab ids with translated labels:

```tsx
import { useTranslations } from "use-intl"
import type { Locale } from "@workspace/i18n/config"
import LanguageSettings from "./LanguageSettings"
// …
export type SettingsTab = "account" | "sessions" | "language" | "billing" | "apiKeys" | "webhooks"
// SettingsDialogProps: openedTab?: SettingsTab; onLocaleChange?: (locale: Locale) => void | Promise<void>;

  const t = useTranslations("settings")
  // scaffold:begin billing
  const tBilling = useTranslations("billing")
  // scaffold:end billing
  // scaffold:begin api_keys
  const tApiKeys = useTranslations("api_keys")
  // scaffold:end api_keys
  // scaffold:begin webhooks
  const tWebhooks = useTranslations("webhooks")
  // scaffold:end webhooks

  const nav: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "account", label: t("tabs.account"), icon: CircleUserIcon },
    { id: "sessions", label: t("tabs.sessions"), icon: RadioIcon },
    ...(onLocaleChange ? [{ id: "language" as const, label: t("tabs.language"), icon: Globe }] : []),
    // scaffold:begin billing
    { id: "billing", label: tBilling("settingsTab"), icon: ReceiptIcon },
    // scaffold:end billing
    // scaffold:begin api_keys
    { id: "apiKeys", label: tApiKeys("settingsTab"), icon: KeyRound },
    // scaffold:end api_keys
    // scaffold:begin webhooks
    { id: "webhooks", label: tWebhooks("settingsTab"), icon: Webhook },
    // scaffold:end webhooks
  ]
  const [currentOpenedTab, setCurrentOpenedTab] = React.useState<SettingsTab>(openedTab || "account")
```

Every `item.name` becomes `item.id` for keys, `value` and comparisons, and `item.label` for display. Each `currentOpenedTab === "My Account"` (and the others) compares against the id. Add:

```tsx
            {currentOpenedTab === "language" && onLocaleChange && <LanguageSettings onLocaleChange={onLocaleChange} />}
```

Replace "Settings" and "Customize your settings here." in the sr-only title/description, `aria-label="Account settings sections"`, and "Settings section" with `t("title")`, `t("description")`, `t("sectionsLabel")` and `t("sectionSelect")`. Replace the API keys and webhooks fallback paragraphs with `tApiKeys("unavailable")` / `tWebhooks("unavailable")`. Delete the commented-out `Notifications` / `Language & Region` / `Privacy & Visibility` entries; the language one is now real. Remove `Bell`, `Lock` and `Link` from the lucide import only if nothing else uses them.

```tsx
// packages/ui/src/components/home/LanguageSettings.tsx
"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import type { Locale } from "@workspace/i18n/config";
import SettingsHeader from "@workspace/ui/components/home/SettingsHeader";
import { LocaleSwitcher } from "@workspace/ui/components/misc/LocaleSwitcher";

export default function LanguageSettings({ onLocaleChange }: { onLocaleChange: (locale: Locale) => void | Promise<void> }) {
  const t = useTranslations("settings.language");
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  return (
    <SettingsHeader title={t("title")} description={t("description")}>
      <LocaleSwitcher
        id="settings-locale"
        value={locale}
        disabled={pending}
        onChange={async (next) => {
          setPending(true);
          try {
            await onLocaleChange(next);
          } finally {
            setPending(false);
          }
        }}
        className="w-full max-w-xs"
      />
    </SettingsHeader>
  );
}
```

`SidebarUser.tsx`: add `onLocaleChange` to the destructured props, pass it to `<SettingsDialog onLocaleChange={onLocaleChange} …>`, and use `const t = useTranslations("settings.menu")` for "Settings", "Theme", "Light", "Dark", "System", "Log out".

`MyAccountSettings.tsx`, with `const t = useTranslations("settings.account")`:

| Literal | Replacement |
|---|---|
| `title = "My Account"`, `description = "For modifying Email…"` | `t("title")`, `t("description")` |
| "Profile Picture", "Upload", "Click the image…", "Username", `label="Display Name"`, "Update" | `t("profilePicture")`, `t("upload")`, `t("uploadHint")`, `t("username")`, `t("displayName")`, `t("update")` |
| "Security", "Manage your password…" | `t("security")`, `t("securityDescription")` |
| labels "Current Password", "New Password", "Confirm Password" | `t("currentPassword")`, `t("newPassword")`, `t("confirmPassword")` |
| aria-labels "Hide/Show old/new/confirm password" | `t("hideCurrent")` / `t("showCurrent")`, `t("hideNew")` / `t("showNew")`, `t("hideConfirm")` / `t("showConfirm")` |
| `"Updating..." : hasPassword ? "Update Password" : "Set Password"` | `t("updating")`, `t("updatePassword")`, `t("setPassword")` |
| "Danger Zone", "Permanently delete…", "Delete Account" | `t("dangerZone")`, `t("dangerDescription")`, `t("deleteAccount")` |
| `label="Type 'permanently delete' to confirm"` | `t("deleteConfirmLabel", { phrase: t("deletePhrase") })` |
| `deleteAccountConfirmation !== 'permanently delete'` | `deleteAccountConfirmation.trim() !== t("deletePhrase")` |
| `"Please type 'permanently delete' to confirm"` | `t("deleteConfirmError", { phrase: t("deletePhrase") })` |
| "Guest account cannot modify password" / "… cannot be deleted" | `t("guestCannotChangePassword")` / `t("guestCannotDelete")` |
| toast titles: "Failed to add password", "Password added successfully!", "Unauthorized", "Session not loaded…", "Error", "Successfully modified password", "Successfully deleted Account", "Unable to update name", "Successfully modified name", "Upload failed", "Successfully Updated Image", "Avatar update is not supported…" | `t("toast.passwordAddFailed")`, `t("toast.passwordAdded")`, `t("toast.unauthorized")`, `t("toast.sessionNotLoaded")`, `t("toast.error")`, `t("toast.passwordChanged")`, `t("toast.accountDeleted")`, `t("toast.nameUpdateFailed")`, `t("toast.nameUpdated")`, `t("toast.uploadFailed")`, `t("toast.imageUpdated")`, `t("toast.avatarUnsupported")` |
| `ResetPasswordSettingsSchema, AddPasswordSchema` imports | `const { ResetPasswordSettingsSchema, AddPasswordSchema } = useAuthSchemas()` |

`SessionSettings.tsx`, with `const t = useTranslations("settings.sessions")` and `const locale = useLocale() as Locale`: replace `dayjs(x).format('DD MMM YYYY, hh:mm A')` with `formatDateTime(x, locale)` from `@workspace/i18n/format` and drop the `dayjs` import. Add `locale` to the `useEffect` dependency list, so switching language reformats. Replace "Sessions", "Manage your active sessions", "Sign out from all other devices", "Device Info", "Date Joined", "Last Active", "Action", "Current", `'Unknown'`, `'Browser'`, `'IP Hidden'`, "Active Now" and "Revoke" with `t("title")`, `t("description")`, `t("signOutOthers")`, `t("device")`, `t("joined")`, `t("lastActive")`, `t("action")`, `t("current")`, `t("unknown")`, `t("browser")`, `t("ipHidden")`, `t("activeNow")` and `t("revoke")`.

`PlansBilling.tsx`: `const t = useTranslations("billing")`; `title={t("title")} description={t("description")}`.
`ProgressWithCredits.tsx`: `const t = useTranslations("billing")`; "Credits Used" → `t("creditsUsed")`.
`GuestBanner.tsx`: `const t = useTranslations("common")`; text → `t("guestBanner")`.

- [ ] **Step 5: Run tests and typecheck**

Run:
```bash
pnpm i18n:check
pnpm --dir packages/ui exec vitest run
pnpm --dir packages/ui typecheck && pnpm --dir apps/web typecheck && pnpm --dir apps/desktop typecheck
pnpm scaffold:matrix --static
```
Expected: PASS. `--static` proves the billing, api_keys and webhooks namespaces disappear cleanly when unselected. Wrap any other failing `packages/ui` test that renders these components (for example `AppSidebar.test.tsx`, `DashboardPage.test.tsx`) with `renderWithIntl`.

- [ ] **Step 6: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/i18n packages/ui scaffold-modules templates/saas-boilerplate
git commit -m "feat(i18n): translate settings, user menu and shared shell components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Web shell and changing language while signed in

**Files:**
- Create: `packages/i18n/src/messages/{en,es}/nav.json`, `{en,es}/home.json`, `{en,es}/jobs.json`, `{en,es}/audit_log.json`, `{en,es}/feature_flags.json`; barrels (`jobs`, `audit_log`, `feature_flags` inside their markers)
- Modify: `scaffold-modules/{jobs,audit_log,feature_flags}/manifest.json` (`unselected.remove` gains both locale files)
- Create: `apps/web/hooks/useChangeLocale.ts`, `apps/web/hooks/__tests__/useChangeLocale.test.tsx`
- Modify: `apps/web/blocks/home/SidebarUser.tsx` (pass `onLocaleChange`)
- Modify: `apps/web/components/home/AppSidebar.tsx`, `apps/web/components/home/BreadcrumbsHeader.tsx`, `apps/web/blocks/Support.tsx`, `apps/web/app/(home)/layout.tsx`
- Modify: `packages/ui/src/components/sidebar/AppSidebar.tsx` (shared with desktop)
- Modify: `template-overrides/saas-boilerplate/apps/web/components/home/AppSidebar.tsx`, `template-overrides/saas-boilerplate/apps/web/app/(home)/page.tsx`
- Modify tests: `apps/web/components/home/BreadcrumbsHeader.test.tsx`, `packages/ui/src/components/sidebar/AppSidebar.test.tsx`

**Interfaces:**
- Consumes: `setLocaleCookie` (Task 2), `onLocaleChange` prop (Task 8), Better Auth `updateUser({ locale })` (Task 4).
- Produces: `useChangeLocale(): (locale: Locale) => Promise<void>`.

- [ ] **Step 1: Catalogues**

```json
// en/nav.json
{
  "application": "Application",
  "admin": "Admin",
  "home": "Home",
  "settings": "Settings",
  "userManagement": "User Management",
  "manageUsers": "Manage Users",
  "cms": "CMS",
  "documentation": "Documentation",
  "scaffolds": "Scaffolds",
  "projects": "Projects",
  "creditsUsage": "Credits usage",
  "seoReports": "SEO Reports",
  "aiManagement": "AI Management",
  "apiManagement": "API Management",
  "portfolio": "Download Portfolio Boilerplate",
  "saasLanding": "Download SaaS Company Landing Page",
  "hikingLanding": "Download Hiking Company Landing Page",
  "comingSoon": "{label} (Coming Soon)",
  "support": { "open": "Open support panel", "options": "Support options", "sendMessage": "Send Message", "documentation": "Documentation", "bookMeeting": "Book Meeting" }
}
```

```json
// es/nav.json
{
  "application": "Aplicación",
  "admin": "Administración",
  "home": "Inicio",
  "settings": "Configuración",
  "userManagement": "Gestión de usuarios",
  "manageUsers": "Gestionar usuarios",
  "cms": "CMS",
  "documentation": "Documentación",
  "scaffolds": "Plantillas",
  "projects": "Proyectos",
  "creditsUsage": "Uso de créditos",
  "seoReports": "Informes SEO",
  "aiManagement": "Gestión de IA",
  "apiManagement": "Gestión de API",
  "portfolio": "Descargar plantilla de portafolio",
  "saasLanding": "Descargar landing page de empresa SaaS",
  "hikingLanding": "Descargar landing page de empresa de senderismo",
  "comingSoon": "{label} (próximamente)",
  "support": { "open": "Abrir panel de soporte", "options": "Opciones de soporte", "sendMessage": "Enviar mensaje", "documentation": "Documentación", "bookMeeting": "Reservar reunión" }
}
```

```json
// en/home.json
{ "memberFor": "Member for", "days": "{count, plural, one {# day} other {# days}}", "creditsRemaining": "Credits remaining", "betaWidget": "Beta widget (feature flag beta.dashboardWidgets)" }
// es/home.json
{ "memberFor": "Miembro desde hace", "days": "{count, plural, one {# día} other {# días}}", "creditsRemaining": "Créditos restantes", "betaWidget": "Widget beta (flag beta.dashboardWidgets)" }
// en/jobs.json              es/jobs.json
{ "nav": { "title": "Background jobs" } }   { "nav": { "title": "Tareas en segundo plano" } }
// en/audit_log.json         es/audit_log.json
{ "nav": { "title": "Audit log" } }         { "nav": { "title": "Registro de auditoría" } }
// en/feature_flags.json     es/feature_flags.json
{ "nav": { "title": "Feature flags" } }     { "nav": { "title": "Flags de funciones" } }
```

Add `nav` and `home` to both barrels unmarked; add `jobs`, `audit_log` and `feature_flags` inside their markers, in the same shape as Task 8. Append each module's two locale files to its manifest's `unselected.remove`.

- [ ] **Step 2: Write the failing test**

```tsx
// apps/web/hooks/__tests__/useChangeLocale.test.tsx
import { act, renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "@workspace/i18n/messages";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateUser: vi.fn(),
  toastError: vi.fn(),
  session: { data: { user: { id: "u1", role: "user" } } } as unknown,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  authClient: { updateUser: mocks.updateUser },
  useSession: () => mocks.session,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import { useChangeLocale } from "../useChangeLocale";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={getMessages("en")}>{children}</NextIntlClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  document.cookie = "NEXT_LOCALE=; max-age=0; path=/";
  mocks.session = { data: { user: { id: "u1", role: "user" } } };
});

describe("useChangeLocale", () => {
  it("saves the choice on the user and in the cookie, then refreshes", async () => {
    mocks.updateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useChangeLocale(), { wrapper });
    await act(() => result.current("es"));
    expect(document.cookie).toContain("NEXT_LOCALE=es");
    expect(mocks.updateUser).toHaveBeenCalledWith({ locale: "es" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("explains a failed save instead of silently doing nothing", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "nope" } });
    const { result } = renderHook(() => useChangeLocale(), { wrapper });
    await act(() => result.current("es"));
    expect(mocks.toastError).toHaveBeenCalledWith("Could not save your language. Please try again.");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("only sets the cookie for visitors and the read-only guest", async () => {
    mocks.session = { data: { user: { id: "g", role: "guest" } } };
    const { result } = renderHook(() => useChangeLocale(), { wrapper });
    await act(() => result.current("es"));
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --dir apps/web exec vitest run hooks/__tests__/useChangeLocale.test.tsx`
Expected: FAIL, `../useChangeLocale` not found.

- [ ] **Step 4: Implement the hook and wire it**

```ts
// apps/web/hooks/useChangeLocale.ts
"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient, useSession } from "@workspace/auth/better-auth/auth-client";
import type { Locale } from "@workspace/i18n/config";
import { setLocaleCookie } from "@workspace/i18n/cookie";

/**
 * Switches the UI language. A signed-in user's choice is saved on their
 * account (it outranks the cookie), so a failed save must not look like success.
 */
export function useChangeLocale() {
  const router = useRouter();
  const t = useTranslations("common");
  const { data: session } = useSession();
  return async (locale: Locale) => {
    setLocaleCookie(locale);
    const user = session?.user;
    if (user && user.role !== "guest") {
      const { error } = await authClient.updateUser({ locale });
      if (error) {
        toast.error(t("languageSaveFailed"));
        return;
      }
    }
    router.refresh();
  };
}
```

In `apps/web/blocks/home/SidebarUser.tsx`: `const changeLocale = useChangeLocale()` and pass `onLocaleChange={changeLocale}` to the `@workspace/ui` `SidebarUser` (or `SettingsDialog`) it renders.

- [ ] **Step 5: Extract the shell**

| File | Literal | Replacement |
|---|---|---|
| `apps/web/components/home/AppSidebar.tsx` (root only; `useTranslations("nav")` plus `jobs`, `audit_log`, `feature_flags`) | "Application", "Admin" | `t("application")`, `t("admin")` |
| | Scaffolds, Projects, Credits usage (tooltip + label) | `t("scaffolds")`, `t("projects")`, `t("creditsUsage")` |
| | Manage Users / User Management, CMS, Documentation, SEO Reports, AI Management, API Management, Settings | `t("manageUsers")` / `t("userManagement")`, `t("cms")`, `t("documentation")`, `t("seoReports")`, `t("aiManagement")`, `t("apiManagement")`, `t("settings")` |
| | Background jobs, Audit log, Feature flags | `tJobs("nav.title")`, `tAudit("nav.title")`, `tFlags("nav.title")` |
| `template-overrides/…/AppSidebar.tsx` (starter) | "Application", "Admin", Home | `t("application")`, `t("admin")`, `t("home")` |
| | Usage (inside billing markers) | `tBilling("nav.usage")`, with `const tBilling = useTranslations("billing")` inside billing markers |
| | Manage Users / User Management, CMS, Documentation, Settings | as above |
| | Background jobs / Audit log / Feature flags (inside their markers) | `tJobs` / `tAudit` / `tFlags`, each `useTranslations(...)` call inside that module's markers |
| `packages/ui/src/components/sidebar/AppSidebar.tsx` (desktop) | "Application", "Admin", "Scaffolds", "User Management" / "Manage Users", "CMS" | `nav` keys as above |
| | "Download Portfolio Boilerplate" (tooltip) / "… (Coming Soon)" (label), and the SaaS and Hiking variants | tooltip `t("portfolio")`; label `t("comingSoon", { label: t("portfolio") })`; likewise `saasLanding`, `hikingLanding` |
| `BreadcrumbsHeader.tsx` | "Home" | `useTranslations("nav")("home")`. Path segments stay as they are: they are URL words, not copy |
| `blocks/Support.tsx` | aria "Open support panel", "Support options"; "Send Message", "Documentation", "Book Meeting" | `t("support.open")`, `t("support.options")`, `t("support.sendMessage")`, `t("support.documentation")`, `t("support.bookMeeting")` with `useTranslations("nav")` |
| `app/(home)/layout.tsx` (server) | LoadingState/ErrorState titles and descriptions | `const t = await getTranslations("common")`; `t("retrieving.title")`, `t("retrieving.description")`, `t("retrieveError.title")`, `t("retrieveError.description")` |
| `template-overrides/…/(home)/page.tsx` | "Member for", `{data.memberSinceDays} days`, "Credits remaining", "Beta widget (…)" | `t("memberFor")`, `t("days", { count: data.memberSinceDays })`, `t("creditsRemaining")`, `t("betaWidget")` with `useTranslations("home")`. Render `formatNumber(data.creditsRemaining, locale)` |

In tests: `BreadcrumbsHeader.test.tsx` renders inside `NextIntlClientProvider locale="en" messages={getMessages("en")}`. `packages/ui/src/components/sidebar/AppSidebar.test.tsx` switches to `renderWithIntl`.

- [ ] **Step 6: Run tests, typecheck, matrix static**

Run:
```bash
pnpm i18n:check
pnpm --dir apps/web exec vitest run && pnpm --dir packages/ui exec vitest run
pnpm --dir apps/web typecheck && pnpm --dir apps/desktop typecheck
pnpm scaffold:matrix --static
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/i18n packages/ui apps/web template-overrides scaffold-modules templates/saas-boilerplate
git commit -m "feat(i18n): translate the web shell and let signed-in users change language

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Landing chrome and the visitor switcher

**Files:**
- Create: `packages/i18n/src/messages/{en,es}/landing.json`; barrels
- Modify: `apps/web/components/landing/{NavbarSection,FooterSection,HeroSection,FeatureSection,PricingItem,TestimonialSection}.tsx`, `apps/web/blocks/landing/{DocSidebar,DocPostPage}.tsx`, `apps/web/app/landing/page.tsx`
- Create: `apps/web/components/landing/__tests__/NavbarSection.test.tsx`

**Interfaces:**
- Consumes: `LocaleSwitcher` (Task 6), `useChangeLocale` (Task 9), `formatRelative` (Task 2).

- [ ] **Step 1: Catalogues**

```json
// en/landing.json
{
  "nav": { "features": "Features", "testimonials": "Testimonials", "faq": "FAQ", "openMenu": "Open navigation menu", "github": "View GitHub repository", "login": "Login" },
  "hero": {
    "titleFallback": "Build and launch your SaaS faster",
    "descriptionFallback": "Ship your product with a production-ready SaaS foundation.",
    "comingSoon": "Coming Soon",
    "documentation": "Documentation",
    "gettingStarted": "Getting Started",
    "productVideo": "Product Video",
    "slideAlt": "Hero Slide",
    "addScreenshots": "Add your product screenshots in the CMS"
  },
  "feature": { "imageAlt": "Feature Image", "visualPreview": "Visual Preview" },
  "pricing": { "mostPopular": "Most popular" },
  "testimonials": { "label": "Customer testimonials" },
  "footer": { "madeBy": "© 2026 Made by" },
  "docs": { "documentation": "Documentation", "breadcrumb": "Docs", "notFound": "No documentation found.", "lastUpdated": "Last updated:" },
  "meta": { "title": "Build and deploy SaaS products" }
}
```

```json
// es/landing.json
{
  "nav": { "features": "Funciones", "testimonials": "Testimonios", "faq": "Preguntas frecuentes", "openMenu": "Abrir menú de navegación", "github": "Ver repositorio de GitHub", "login": "Iniciar sesión" },
  "hero": {
    "titleFallback": "Crea y lanza tu SaaS más rápido",
    "descriptionFallback": "Lanza tu producto sobre una base SaaS lista para producción.",
    "comingSoon": "Próximamente",
    "documentation": "Documentación",
    "gettingStarted": "Primeros pasos",
    "productVideo": "Vídeo del producto",
    "slideAlt": "Diapositiva principal",
    "addScreenshots": "Añade capturas de tu producto en el CMS"
  },
  "feature": { "imageAlt": "Imagen de la función", "visualPreview": "Vista previa" },
  "pricing": { "mostPopular": "Más popular" },
  "testimonials": { "label": "Testimonios de clientes" },
  "footer": { "madeBy": "© 2026 Creado por" },
  "docs": { "documentation": "Documentación", "breadcrumb": "Documentación", "notFound": "No se encontró documentación.", "lastUpdated": "Última actualización:" },
  "meta": { "title": "Crea y despliega productos SaaS" }
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// apps/web/components/landing/__tests__/NavbarSection.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { getMessages } from "@workspace/i18n/messages";

const changeLocale = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/hooks/useChangeLocale", () => ({ useChangeLocale: () => changeLocale }));

import NavbarSection from "../NavbarSection";

const navbarSection = { title: "Acme", logo: "", darkLogo: "", githubLink: "", githubUsername: "", githubRepositoryName: "" } as never;

describe("NavbarSection", () => {
  it("renders Spanish links and lets a visitor switch language", () => {
    render(
      <NextIntlClientProvider locale="es" messages={getMessages("es")}>
        <NavbarSection navbarSection={navbarSection} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("Funciones").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } });
    expect(changeLocale).toHaveBeenCalledWith("en");
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --dir apps/web exec vitest run components/landing/__tests__/NavbarSection.test.tsx`
Expected: FAIL, "Funciones" not found.

- [ ] **Step 4: Implement**

`NavbarSection.tsx`, with `const t = useTranslations("landing.nav")`, `const locale = useLocale() as Locale` and `const changeLocale = useChangeLocale()`: replace "Features", "Testimonials", "FAQ" (both menus), the aria-labels and "Login" with `t(...)`. Add `<LocaleSwitcher value={locale} onChange={changeLocale} id="landing-locale" className="h-9" />` in the right-hand `div` before the Login button.

| File | Literal | Replacement (`useTranslations("landing")`) |
|---|---|---|
| `HeroSection.tsx` | the two `||` fallbacks, "Coming Soon", "Documentation", "Getting Started", `title="Product Video"`, "Hero Slide", "Add your product screenshots in the CMS" | `t("hero.titleFallback")`, `t("hero.descriptionFallback")`, `t("hero.comingSoon")`, `t("hero.documentation")`, `t("hero.gettingStarted")`, `t("hero.productVideo")`, `t("hero.slideAlt")`, `t("hero.addScreenshots")` |
| `FeatureSection.tsx` | "Feature Image", "Visual Preview" | `t("feature.imageAlt")`, `t("feature.visualPreview")` |
| `PricingItem.tsx` | "Most popular" | `t("pricing.mostPopular")` |
| `TestimonialSection.tsx` | `aria-label="Customer testimonials"` | `t("testimonials.label")` |
| `FooterSection.tsx` | "&copy; 2026 Made by" | `t("footer.madeBy")` |
| `blocks/landing/DocSidebar.tsx` | "Documentation" | `t("docs.documentation")` |
| `blocks/landing/DocPostPage.tsx` | "No documentation found.", "Docs", "Last updated:" | `t("docs.notFound")`, `t("docs.breadcrumb")`, `t("docs.lastUpdated")` |
| | `formatDistanceToNow(date, { addSuffix: true })` | `formatRelative(date, locale)` from `@workspace/i18n/format`; drop the `date-fns` import if unused |
| `app/landing/page.tsx` | `title: "Build and deploy SaaS products"`; LoadingState/ErrorState strings | `(await getTranslations("landing.meta"))("title")`; `common` `retrieving.*` / `retrieveError.*` |

Leave `LegalPageLayout.tsx`, `ContactUs.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx` and `CancellationRefundPolicies.tsx` untouched (Global Constraints).

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm i18n:check && pnpm --dir apps/web exec vitest run && pnpm --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/i18n apps/web templates/saas-boilerplate
git commit -m "feat(i18n): translate landing and docs chrome; language switcher for visitors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Emails in the recipient's language

**Files:**
- Create: `packages/i18n/src/messages/{en,es}/email.json`, `{en,es}/multi_tenancy.json`, `{en,es}/notifications.json`; barrels (`multi_tenancy`, `notifications` inside markers)
- Modify: `scaffold-modules/multi_tenancy/manifest.json`, `scaffold-modules/notifications/manifest.json` (`unselected.remove`)
- Create: `packages/email/src/i18n.ts`
- Modify: `packages/email/src/templates/{EmailVerification,ResetPassword,Invitation,OrganizationInvitation,Notification}.tsx`
- Modify: `packages/email/src/resend/{index,organization,notification}.ts`, `packages/email/src/jobs.ts`
- Modify: `packages/auth/src/better-auth/auth.ts` (three `sendEmail` calls), `packages/auth/src/better-auth/organization.ts` (`InvitationEmailData`, `sendInvitationEmail`)
- Modify: `apps/web/trpc/routers/adminProcedures.ts` (two invitation sends), `apps/web/lib/notifications/deliver.ts`
- Modify tests: `packages/email/src/templates/templates.test.tsx`, `packages/email/src/jobs.test.ts`

**Interfaces:**
- Consumes: `getMessages`, `toLocale`, `DEFAULT_LOCALE` (Task 2); `user.locale` (Task 4).
- Produces: `emailTranslator(locale?: Locale, namespace?: "email")` (a `createTranslator` result); templates take an optional `locale?: Locale` prop; senders take `locale?: Locale` as their last argument (or a `locale` field for object-arg senders); the `email.send` payload accepts `locale?: "en" | "es"`.

- [ ] **Step 1: Catalogues**

```json
// en/email.json
{
  "hello": "Hello,",
  "buttonFallback": "If the button above doesn't work, copy and paste the following link into your browser:",
  "rights": "© {year} {company}. All rights reserved.",
  "questions": "If you have any questions, feel free to reply to this email",
  "verification": {
    "subject": "Verify Your Email Address",
    "heading": "Verify Your Email",
    "body": "Thank you for registering with us! Please click the button below to verify your email address:",
    "button": "Verify Email",
    "ignore": "If you did not create an account, no further action is required."
  },
  "reset": {
    "subject": "Reset your password",
    "heading": "Reset your Password",
    "body": "Please click the button below to reset your password:",
    "button": "Reset Password",
    "ignore": "If you do not want to reset your password, no further action is required."
  },
  "invitation": {
    "subject": "You're invited to {company}",
    "heading": "You're invited to {company}",
    "body": "You've been invited to join {company}. Click below to create your account:",
    "button": "Accept Invitation",
    "linkFallback": "If the button above doesn't work, copy and paste this link into your browser:",
    "expires": "This invitation will expire in 7 days."
  }
}
```

```json
// es/email.json
{
  "hello": "Hola:",
  "buttonFallback": "Si el botón anterior no funciona, copia y pega el siguiente enlace en tu navegador:",
  "rights": "© {year} {company}. Todos los derechos reservados.",
  "questions": "Si tienes alguna pregunta, responde a este correo",
  "verification": {
    "subject": "Verifica tu dirección de correo electrónico",
    "heading": "Verifica tu correo electrónico",
    "body": "¡Gracias por registrarte! Haz clic en el botón de abajo para verificar tu dirección de correo electrónico:",
    "button": "Verificar correo",
    "ignore": "Si no has creado una cuenta, no tienes que hacer nada."
  },
  "reset": {
    "subject": "Restablece tu contraseña",
    "heading": "Restablece tu contraseña",
    "body": "Haz clic en el botón de abajo para restablecer tu contraseña:",
    "button": "Restablecer contraseña",
    "ignore": "Si no quieres restablecer tu contraseña, no tienes que hacer nada."
  },
  "invitation": {
    "subject": "Te han invitado a {company}",
    "heading": "Te han invitado a {company}",
    "body": "Te han invitado a unirte a {company}. Haz clic abajo para crear tu cuenta:",
    "button": "Aceptar invitación",
    "linkFallback": "Si el botón anterior no funciona, copia y pega este enlace en tu navegador:",
    "expires": "Esta invitación caduca en 7 días."
  }
}
```

```json
// en/multi_tenancy.json
{ "email": { "invitation": {
  "subject": "{inviter} invited you to {organization}",
  "heading": "Join {organization} on {company}",
  "body": "{inviter} invited you to join the {organization} workspace as {role}.",
  "button": "View Invitation",
  "help": "Sign in (or create an account) with this email address to accept. You can also accept it later from the workspace menu in the app.",
  "expires": "This invitation will expire in 7 days."
} } }
// es/multi_tenancy.json
{ "email": { "invitation": {
  "subject": "{inviter} te ha invitado a {organization}",
  "heading": "Únete a {organization} en {company}",
  "body": "{inviter} te ha invitado a unirte al espacio de trabajo {organization} como {role}.",
  "button": "Ver invitación",
  "help": "Inicia sesión (o crea una cuenta) con esta dirección de correo para aceptar. También puedes aceptarla más tarde desde el menú de espacios de trabajo de la aplicación.",
  "expires": "Esta invitación caduca en 7 días."
} } }
// en/notifications.json
{ "email": { "open": "Open {company}", "footer": "You can turn these emails off under Notifications in {company}." } }
// es/notifications.json
{ "email": { "open": "Abrir {company}", "footer": "Puedes desactivar estos correos en Notificaciones dentro de {company}." } }
```

- [ ] **Step 2: Write the failing tests**

Append to `templates.test.tsx`:

```tsx
describe('localized templates', () => {
    it('renders the verification email in Spanish', async () => {
        const html = await render(EmailVerification({ verificationLink: "https://x.test/v", company: "Acme", locale: "es" }));
        expect(html).toContain('Verifica tu correo electrónico');
        expect(html).toContain('Todos los derechos reservados');
    });

    it('renders the reset email in Spanish', async () => {
        const html = await render(ResetPassword({ resetPasswordLink: "https://x.test/r", company: "Acme", locale: "es" }));
        expect(html).toContain('Restablece tu contraseña');
    });
});
```

Append to `jobs.test.ts`:

```ts
  it("accepts payloads queued before locale existed, and a locale", () => {
    expect(emailJob.schema.safeParse({ template: "reset", email: "a@b.c", url: "u" }).success).toBe(true);
    expect(emailJob.schema.safeParse({ template: "reset", email: "a@b.c", url: "u", locale: "es" }).success).toBe(true);
    expect(emailJob.schema.safeParse({ template: "reset", email: "a@b.c", url: "u", locale: "xx" }).success).toBe(false);
  });
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --dir packages/email exec vitest run`
Expected: FAIL. The templates have no `locale` prop and the job schema rejects `locale`.

- [ ] **Step 4: Implement**

```ts
// packages/email/src/i18n.ts
import { createTranslator } from "use-intl";
import { DEFAULT_LOCALE, type Locale } from "@workspace/i18n/config";
import { getMessages } from "@workspace/i18n/messages";

/** Email copy in the recipient's language (outside React, no provider needed). */
export function emailTranslator(locale: Locale = DEFAULT_LOCALE) {
  return createTranslator({ locale, messages: getMessages(locale), namespace: "email" });
}
```

`EmailVerification.tsx` (the pattern; ResetPassword and Invitation follow it with `reset.*` / `invitation.*`):

```tsx
import type { Locale } from '@workspace/i18n/config';
import { emailTranslator } from '../i18n';

const EmailVerification = ({ verificationLink, company, locale }: { verificationLink: string, company: string, locale?: Locale }) => {
  const t = emailTranslator(locale);
  return (
    <Html lang={locale ?? 'en'}>
      {/* … */}
            <Text className="text-xl font-bold">{t('verification.heading')}</Text>
            <Text className="text-lg mb-4">{t('hello')}</Text>
            <Text className="mb-4">{t('verification.body')}</Text>
            <Button href={verificationLink} className="…">{t('verification.button')}</Button>
            <Text className="mt-6">{t('buttonFallback')}</Text>
            <Text className="mt-4 text-gray-600">{t('verification.ignore')}</Text>
            <Text className="text-gray-500">{t('rights', { year: new Date().getFullYear(), company })}</Text>
            <Text className="text-gray-500 mt-2">{t('questions')}</Text>
```

The hardcoded "© 2025" becomes the current year. Invitation uses `t('invitation.heading', { company })`, `t('invitation.body', { company })`, `t('invitation.linkFallback')` and `t('invitation.expires')`.

`OrganizationInvitation.tsx` (module file): `const t = createTranslator({ locale: locale ?? DEFAULT_LOCALE, messages: getMessages(locale ?? DEFAULT_LOCALE), namespace: "multi_tenancy.email.invitation" })`; `t('heading', { organization: organizationName, company })`, `t('body', { inviter: inviterName, organization: organizationName, role })`, `t('button')`, `t('help')`, `t('expires')`, and the shared `emailTranslator(locale)('hello')` and `('rights', …)`.

`Notification.tsx` (module file): namespace `"notifications.email"`; `t('open', { company })`, `t('footer', { company })`.

Senders (`resend/index.ts`): add a final `locale?: Locale` parameter to `sendVerificationEmail`, `sendResetEmail` and `sendInvitationEmail`. Build `const t = emailTranslator(locale)`, use `t('verification.subject')` / `t('reset.subject')` / `t('invitation.subject', { company })` as the subject, and pass `locale` to the template. `resend/organization.ts`: accept `locale?: Locale`, subject `t('subject', { inviter: inviterName, organization: organizationName })`. `resend/notification.ts`: accept `locale?: Locale` and pass it to the template. The title is already rendered.

`jobs.ts`: add `locale: z.enum(LOCALES).optional()` (import `LOCALES` from `@workspace/i18n/config`) to the `verification`, `reset`, `invitation` and `organization-invitation` objects. In `deliver`, pass `input.locale` to each sender.

Call sites:

| File | Change |
|---|---|
| `packages/auth/src/better-auth/auth.ts` `changeEmail` | `sendEmail({ template: "verification", email: newEmail, url, locale: toLocale((user as { locale?: unknown }).locale) })` |
| `sendResetPassword` | `…, locale: toLocale((user as { locale?: unknown }).locale) })` |
| `sendVerificationEmail` | same |
| `packages/auth/src/better-auth/organization.ts` | add `locale?: string \| null` to `inviter.user` in `InvitationEmailData`; pass `locale: toLocale(data.inviter.user.locale)` |
| `apps/web/trpc/routers/adminProcedures.ts` (both invitation sends) | `…, locale: toLocale(ctx.session.user.locale) }` |
| `apps/web/lib/notifications/deliver.ts` | `select: { email: true, locale: true }`; `sendNotificationEmail({ …, locale: toLocale(user.locale) })` |

The support email has no template and goes to the operator; leave it unchanged.

- [ ] **Step 5: Run tests and typecheck**

Run:
```bash
pnpm i18n:check
pnpm --dir packages/email exec vitest run && pnpm --dir packages/auth exec vitest run && pnpm --dir apps/web exec vitest run
pnpm --dir packages/email typecheck && pnpm --dir packages/auth typecheck && pnpm --dir apps/web typecheck
pnpm scaffold:matrix --static
```
Expected: PASS. The existing English template assertions ('Verify Your Email', 'Reset your Password') still hold because `locale` defaults to `en`.

- [ ] **Step 6: Commit**

```bash
pnpm template:sync && pnpm template:check-sync
git add packages/i18n packages/email packages/auth apps/web scaffold-modules templates/saas-boilerplate
git commit -m "feat(i18n): send auth, invitation and notification emails in the recipient's language

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Guard, docs and full verification

**Files:**
- Modify: `apps/web/eslint.config.js`, `packages/ui/eslint.config.js`
- Modify: `CLAUDE.md` (new "Internationalization" section under Web Architecture Notes), `README.md` ("Adding a language")
- Modify: `docs/superpowers/specs-priority-2026-10/00-README.mdx` (the i18n row: deferred → done, with the commit)

- [ ] **Step 1: Add the literal guard**

`apps/web` ESLint config, appended block:

```js
  {
    // Translated surfaces: copy goes through next-intl / use-intl (packages/i18n).
    files: [
      "app/(auth)/**/*.tsx",
      "components/home/**/*.tsx",
      "components/i18n/**/*.tsx",
      "blocks/Support.tsx",
      "blocks/home/**/*.tsx",
      "components/landing/{NavbarSection,FooterSection,HeroSection,FeatureSection,PricingItem,TestimonialSection}.tsx",
      "blocks/landing/{DocSidebar,DocPostPage}.tsx",
    ],
    ignores: ["**/*.test.tsx"],
    rules: { "react/jsx-no-literals": ["error", { noStrings: false, ignoreProps: true, allowedStrings: ["/", "•", "*", "·", "|", "-"] }] },
  },
```

`packages/ui` config, the same rule for `src/components/auth/**`, `src/components/home/{SettingsDialog,SidebarUser,MyAccountSettings,SessionSettings,PlansBilling,ProgressWithCredits,LanguageSettings}.tsx`, `src/components/misc/{GuestBanner,LocaleSwitcher}.tsx` and `src/components/sidebar/AppSidebar.tsx`. If `eslint-plugin-react` isn't registered in that config, register it the way `@workspace/eslint-config` does.

Run: `pnpm lint`
Expected: PASS. Any reported literal is a missed extraction: move it into the catalogue (en and es), never into `allowedStrings`.

- [ ] **Step 2: Docs**

CLAUDE.md, under "Web Architecture Notes":

```markdown
Internationalization (`packages/i18n`):

- Locales live in `src/config.ts` (`en`, `es`). The active one comes from `User.locale`, then the `NEXT_LOCALE` cookie, then `Accept-Language`, then the `i18n.defaultLocale` site setting. There is no URL prefix.
- Messages are `src/messages/<locale>/<namespace>.json`, imported by each locale's `index.ts`. English is the source and the `Messages` type, so a missing English key fails typecheck; `pnpm i18n:check` fails on missing or extra keys, bad ICU or placeholder drift in other locales.
- A string that only appears inside a module's markers goes in `<module id>.json`, imported inside the same markers in both barrels and listed in the module's `unselected.remove`.
- Web uses `next-intl` (`useTranslations`, `getTranslations`). `packages/ui`, desktop and emails import from `use-intl` only. Format dates and money with `@workspace/i18n/format` and `useLocale()`.
- ICU treats `'` before `{` as an escape: quote placeholders with “ ” or « ».
- Adding a language: add it to `LOCALES`, copy `messages/en` to `messages/<locale>`, translate, and add its endonym to `common.locales` in every locale.
```

README: a short "Adding a language" section with the last bullet's steps and `pnpm i18n:check`.

- [ ] **Step 3: Full verification**

Run:
```bash
pnpm i18n:check
pnpm typecheck
pnpm lint
pnpm arch:check
pnpm test
pnpm template:sync && pnpm template:check-sync
pnpm scaffold:matrix
pnpm template:build
```
Expected: all PASS. `scaffold:matrix` (pairwise, full typecheck) is the proof that every module's namespace leaves cleanly.

- [ ] **Step 4: Browser check** (needs the owner's `pnpm migrate` for `User.locale` first; skip the signed-in half and say so if it hasn't run)

With `pnpm --dir apps/web dev` running:
1. As a visitor with the browser language set to Spanish, open `/landing`: the navbar reads "Funciones" and `<html lang="es">`.
2. Switch to English in the navbar, then reload: it stays English (cookie).
3. Sign in, open Settings → Language & Region, choose Español: the shell, settings and user menu switch without a reload of the URL.
4. Sign out, clear cookies, sign in again: Spanish (`User.locale`).
5. Request a password reset: with no email client configured, the skipped-email warning in the server log shows the Spanish subject.
6. In `/admin/settings`, set Default language to Español; in a fresh private window with an unsupported browser language (for example German), `/landing` renders Spanish.

- [ ] **Step 5: Commit and update the roadmap note**

```bash
git add apps/web packages/ui CLAUDE.md README.md docs/superpowers/specs-priority-2026-10/00-README.mdx templates/saas-boilerplate
git commit -m "chore(i18n): guard translated surfaces against literals; document the workflow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Report to the owner: the migration to run (`pnpm migrate` for `User.locale`, additive); that Better Auth's server error messages stay English; that `es` is machine-drafted and needs a native review; and the follow-up specs from the spec.
