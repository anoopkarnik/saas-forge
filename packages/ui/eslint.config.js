import { config } from "@workspace/eslint-config/react-internal"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: [
      "src/blocks/admin/**/*.tsx",
      "src/components/admin/**/*.tsx",
      "src/components/home/**/*.tsx",
      "src/components/mdx/**/*.tsx",
      "src/components/notion/**/*.tsx",
      "src/components/payments/**/*.tsx",
      "src/lib/zod/**/*.ts",
      "src/lib/utils/scaffold.ts",
    ],
    rules: {
      // These surfaces adapt loosely typed CMS, scaffold, Notion, and billing payloads.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/components/aceternity/**/*.tsx",
      "src/hooks/use-outside-click.tsx",
      "src/lib/constants/module.ts",
      "src/lib/zod/validators.ts",
    ],
    rules: {
      // Third-party inspired visual utilities intentionally accept broad callback/input shapes.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "src/blocks/dashboard/**/*.tsx",
      "src/components/aceternity/**/*.tsx",
      "src/components/auth/**/*.tsx",
      "src/components/home/**/*.tsx",
      "src/components/mdx/**/*.tsx",
      "src/components/payments/**/*.tsx",
      "src/components/sidebar/**/*.tsx",
      "src/lib/constants/**/*.tsx",
    ],
    rules: {
      // Legacy scaffold UI exports keep some reserved props/imports for template parity.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/components/auth/Quote.tsx"],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
  {
    files: ["src/components/misc/floating-label-input.tsx"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
]
