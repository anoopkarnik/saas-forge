import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: ["next-env.d.ts"],
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      // Integration tests mock framework/database boundaries with intentionally broad shapes.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "app/(auth)/**/*.tsx",
      "app/(home)/admin/**/*.tsx",
      "app/api/**/*.ts",
      "blocks/home/**/*.tsx",
      "components/landing/**/*.tsx",
      "components/support/**/*.tsx",
      "lib/functions/**/*.ts",
      "trpc/routers/**/*.ts",
    ],
    rules: {
      // Route handlers and adapters bridge external CMS, auth, payment, and webhook payloads.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "app/(auth)/**/*.tsx",
      "blocks/**/*.tsx",
      "components/**/*.tsx",
      "lib/functions/**/*.ts",
      "trpc/routers/**/*.ts",
    ],
    rules: {
      // The template carries configurable sections where props/imports are present across variants.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["app/**/*.ts", "app/**/*.tsx"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    files: [
      "blocks/landing/**/*.tsx",
      "components/landing/**/*.tsx",
      "components/support/**/*.tsx",
    ],
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["components/home/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]
