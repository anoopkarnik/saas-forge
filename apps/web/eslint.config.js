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
  {
    // These env vars are only defaults now: UI reads the runtime value from
    // useSiteConfig() (or getSiteConfig() on the server), see lib/site-config.
    files: ["app/**/*.tsx", "blocks/**/*.tsx", "components/**/*.tsx", "hooks/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^NEXT_PUBLIC_(THEME|THEME_TYPE|SAAS_NAME|SITE_DESCRIPTION|AUTH_EMAIL|AUTH_GOOGLE|AUTH_GITHUB|AUTH_LINKEDIN|CALENDLY_BOOKING_URL|GOOGLE_ANALYTICS_MEASUREMENT_ID)$/]",
          message: "This setting is runtime site config: use useSiteConfig() or getSiteConfig().",
        },
      ],
    },
  },
]
