# SaaS Forge posts (root only)

MDX files for SaaS Forge's own blog posts live here and are registered in
`packages/database/src/constants/blog.ts` with `filePath: "saas-forge/<file>.mdx"`.

This folder is excluded from the released starter (`template-sync.manifest.json`),
and the starter's `constants/blog.ts` override lists only the sample posts.
