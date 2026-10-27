/** Rebuild the local CMS illustrations. No network or image-generation service. */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "apps/web/package.json"));
const sharp = require("sharp");
const out = path.join(root, "apps/web/public/cms/v2");
await fs.mkdir(out, { recursive: true });

// Match the live landing site's charcoal surfaces and green accent.
const palette = {
  paper: "#09090b",
  surface: "#18181b",
  ink: "#fafafa",
  muted: "#a1a1aa",
  rule: "#3f3f46",
  grid: "#27272a",
  accent: "#00c950",
  tint: "#10251a",
};
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const text = (x, y, s, size = 24, color = palette.ink, weight = 400) =>
  `<text x="${x}" y="${y}" font-family="DejaVu Sans, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`;
function wrap(s, max) {
  const lines = [];
  for (const word of s.split(" ")) {
    if (!lines.length || lines.at(-1).length + word.length + 1 > max)
      lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}
function frame(slug, title, desc, w, h, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${slug}-title ${slug}-desc"><title id="${slug}-title">${esc(title)}</title><desc id="${slug}-desc">${esc(desc)}</desc><defs><marker id="${slug}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="${palette.muted}"/></marker><pattern id="${slug}-grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${palette.grid}"/></pattern></defs><rect width="${w}" height="${h}" fill="${palette.paper}"/><rect width="${w}" height="${h}" fill="url(#${slug}-grid)"/>${content}</svg>`;
}
function node(x, y, w, title, sub, focal = false) {
  return `<rect x="${x}" y="${y}" width="${w}" height="124" rx="8" fill="${focal ? palette.tint : palette.surface}" stroke="${focal ? palette.accent : palette.rule}" stroke-width="2"/>${text(x + 24, y + 46, title, 25, palette.ink, 600)}${text(x + 24, y + 86, sub, 19, palette.muted)}`;
}
const line = (slug, x1, y1, x2, y2) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${palette.muted}" stroke-width="2" marker-end="url(#${slug}-arrow)"/>`;
const diagrams = [
  {
    slug: "architecture",
    title: "One platform. Three clients.",
    sub: "Shared account access, typed APIs and product services.",
    rows: [
      [
        ["Web", "Next.js"],
        ["Desktop", "Electron"],
        ["Mobile", "Expo"],
      ],
      [["Web API", "tRPC · REST · Better Auth"]],
      [
        ["Product services", "Server authorization"],
        ["Postgres", "Prisma · shared data"],
      ],
    ],
    note: "Clients access account data through the web API; shared packages hold reusable code.",
  },
  {
    slug: "module-selection",
    title: "Start with your selection.",
    sub: "The builder compiles a focused starter for your product.",
    rows: [
      [["Choose", "Modules · providers · platforms"]],
      [
        ["Compile", "Remove unselected code"],
        ["Validate", "Install · generate · typecheck"],
      ],
      [["Download", "Your starter + SETUP.md"]],
    ],
    note: "Core is always included. Required module dependencies follow your selection.",
  },
  {
    slug: "event-delivery",
    title: "Commit first. Deliver after.",
    sub: "A shared workflow for product notifications and outgoing events.",
    rows: [
      [["Product change", "Commit application data"]],
      [
        ["Notification", "Inbox + preferences"],
        ["Outgoing event", "Versioned payload"],
      ],
      [["Delivery jobs", "Email + signed webhook delivery"]],
    ],
    note: "Inngest provides durable retries. Without it, the inline fallback has different delivery guarantees.",
  },
  {
    slug: "release-upgrades",
    title: "Keep your code. Bring the fixes.",
    sub: "A release update starts from the version your project received.",
    rows: [
      [["Check status", "Installed release → latest release"]],
      [["Review the kit", "Owned modules · file delta"]],
      [["Merge & verify", "Custom code + release changes"]],
    ],
    note: "Release kits are free for code you own and require available release snapshots.",
  },
  {
    slug: "mcp-access",
    title: "Your account, through scoped tools.",
    sub: "Read-only product context for connected AI clients.",
    rows: [
      [["AI client", "Scoped API key"]],
      [["MCP endpoint", "Authenticate · validate · authorize"]],
      [["Account services", "Only the key owner’s permitted data"]],
    ],
    note: "Available tools follow the installed modules. Credit-spending actions stay outside the model.",
  },
  {
    slug: "project-launchpad",
    title: "A practical path to launch.",
    sub: "Curated guidance follows your saved project selection.",
    rows: [
      [
        ["Run locally", "Configure · generate · start"],
        ["Build your MVP", "Adapt · integrate · verify"],
      ],
      [["Launch", "Deploy · migrate · check"]],
      [["Operate", "Observe · maintain · update"]],
    ],
    note: "The checklist is available immediately. Ask for help adds optional AI assistance.",
  },
  {
    slug: "ai-execution",
    title: "AI work, with clear boundaries.",
    sub: "Web authorization and orchestration; signed Python execution.",
    rows: [
      [["Web application", "User access + job dispatch"]],
      [["Web Inngest", "Background orchestration"]],
      [
        ["Python service", "LangGraph agents"],
        ["RAG collections", "pgvector retrieval"],
      ],
    ],
    note: "AI Agents & RAG requires AI Platform and Jobs. Provider credentials remain on the server.",
  },
];
const gallery = [];
async function save(slug, svg) {
  await fs.writeFile(path.join(out, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, `${slug}.png`));
  gallery.push(svg);
}
for (const d of diagrams) {
  let body = text(
    80,
    76,
    "SAAS FORGE / PLATFORM GUIDE",
    19,
    palette.accent,
    600,
  );
  body +=
    text(80, 145, d.title, 48, palette.ink, 600) +
    text(80, 194, d.sub, 24, palette.muted);
  const rows = d.rows.map((row, i) =>
    row.map(([title, sub], j) => ({
      x:
        row.length === 1
          ? 500
          : row.length === 2
            ? 270 + j * 550
            : 100 + j * 510,
      y: 260 + i * 188,
      w: row.length === 3 ? 380 : row.length === 2 ? 510 : 600,
      title,
      sub,
    })),
  );
  // Use one visible connector per relationship, with separate target attach points.
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i],
      b = rows[i + 1];
    if (a.length === 1 && b.length === 1)
      body += line(d.slug, 800, a[0].y + 124, 800, b[0].y - 10);
    else if (a.length === 1) {
      for (let j = 0; j < b.length; j++) {
        const target = b[j];
        const sx = a[0].x + 80 + (j * (a[0].w - 160)) / (b.length - 1);
        const tx = target.x + target.w / 2;
        const mid = a[0].y + 150;
        if (sx === tx) {
          body += line(d.slug, sx, a[0].y + 124, tx, target.y - 10);
          continue;
        }
        body += `<path d="M${sx} ${a[0].y + 124} V${mid - 8} Q${sx} ${mid} ${sx + (tx > sx ? 8 : -8)} ${mid} H${tx + (tx > sx ? -8 : 8)} Q${tx} ${mid} ${tx} ${mid + 8} V${target.y - 10}" fill="none" stroke="${palette.muted}" stroke-width="2" marker-end="url(#${d.slug}-arrow)"/>`;
      }
    } else {
      for (let j = 0; j < a.length; j++) {
        const source = a[j];
        const sx = source.x + source.w / 2;
        const target = b[0];
        const tx = target.x + 70 + (j * (target.w - 140)) / (a.length - 1);
        const mid = source.y + 150;
        if (sx === tx) {
          body += line(d.slug, sx, source.y + 124, tx, target.y - 10);
          continue;
        }
        body += `<path d="M${sx} ${source.y + 124} V${mid - 8} Q${sx} ${mid} ${sx + (tx > sx ? 8 : -8)} ${mid} H${tx + (tx > sx ? -8 : 8)} Q${tx} ${mid} ${tx} ${mid + 8} V${target.y - 10}" fill="none" stroke="${palette.muted}" stroke-width="2" marker-end="url(#${d.slug}-arrow)"/>`;
      }
    }
  }
  rows.forEach((row, i) =>
    row.forEach((n) => {
      body += node(n.x, n.y, n.w, n.title, n.sub, i === 1);
    }),
  );
  body +=
    `<path d="M80 825 H1520" stroke="${palette.rule}"/>` +
    text(80, 862, d.note, 19, palette.muted);
  await save(d.slug, frame(d.slug, d.title, d.note, 1600, 900, body));
}

const { featureSectionData } =
  await import("../packages/database/src/constants/features.ts");
const features = featureSectionData.features;
const flows = {
  platform: [
    "Choose your clients",
    "Share auth and typed APIs",
    "Build your product",
  ],
  auth: ["Sign in", "Verify the account", "Authorize the action"],
  billing: ["Checkout", "Credit the account once", "Explain the usage"],
  "multi-tenancy": [
    "Create a workspace",
    "Invite the team",
    "Apply workspace roles",
  ],
  ai: ["Send a message", "Stream model and tool output", "Record total usage"],
  "ai-agents": [
    "Dispatch a job",
    "Run agents or retrieval",
    "Return the result",
  ],
  jobs: [
    "Enqueue typed work",
    "Run with retries",
    "Inspect and replay failures",
  ],
  notifications: [
    "Emit after commit",
    "Respect preferences",
    "Deliver inbox and email",
  ],
  "audit-log": [
    "Change configuration",
    "Redact event metadata",
    "Filter and export activity",
  ],
  webhooks: ["Commit an event", "Sign and deliver", "Retry or replay"],
  "feature-flags": [
    "Define a default",
    "Evaluate targeting rules",
    "Enforce on the server",
  ],
  onboarding: [
    "Welcome the user",
    "Check real progress",
    "Continue at their pace",
  ],
  analytics: [
    "Declare a typed event",
    "Apply consent controls",
    "Understand activation",
  ],
  "api-keys": [
    "Create a scoped key",
    "Check expiry and rate limits",
    "Authorize API access",
  ],
  mcp: [
    "Connect an AI client",
    "Validate key and input",
    "Read permitted account data",
  ],
  cms: [
    "Write your content",
    "Edit in code or Postgres",
    "Publish landing pages and docs",
  ],
  settings: [
    "Set environment defaults",
    "Save runtime overrides",
    "Render localized app messages",
  ],
  storage: [
    "Validate the image",
    "Choose Blob or R2",
    "Store and serve the asset",
  ],
  launchpad: [
    "Run your starter locally",
    "Build and launch",
    "Operate and update",
  ],
  upgrades: [
    "Check the project release",
    "Review the file delta",
    "Merge and verify",
  ],
};
for (const [i, f] of features.entries()) {
  // Explorer-only entries have no legacy illustration. Keep existing docs assets
  // intact and only regenerate images owned by this illustration library.
  if (!f.imageUrl?.startsWith("/cms/v2/") || !f.imageUrl.endsWith(".png")) continue;
  const slug = path.basename(f.imageUrl, ".png");
  const flow = flows[slug];
  if (!flow) continue;
  let body =
    text(140, 100, "SAAS FORGE", 21, palette.accent, 600) +
    text(140, 150, f.category.toUpperCase(), 17, palette.muted, 600);
  const titles = wrap(f.title, 27);
  titles.forEach((s, j) => {
    body += text(140, 225 + j * 52, s, 42, palette.ink, 600);
  });
  const y = 355;
  for (let j = 0; j < 2; j++)
    body += line(slug, 600, y + j * 130 + 90, 600, y + (j + 1) * 130 - 10);
  flow.forEach((s, j) => {
    const yy = y + j * 130;
    body += `<rect x="140" y="${yy}" width="920" height="90" rx="8" fill="${j === 1 ? palette.tint : palette.surface}" stroke="${j === 1 ? palette.accent : palette.rule}" stroke-width="2"/>`;
    body +=
      text(
        172,
        yy + 55,
        `0${j + 1}`,
        20,
        j === 1 ? palette.accent : palette.muted,
        600,
      ) + text(235, yy + 55, s, 28, palette.ink, 600);
  });
  body +=
    `<path d="M140 785 H1060" stroke="${palette.rule}"/>` +
    text(
      140,
      835,
      `${String(i + 1).padStart(2, "0")} / SHARED FOUNDATION + OPTIONAL MODULES`,
      16,
      palette.muted,
    );
  await save(
    slug,
    frame(slug, f.title, flow.join(", then ") + ".", 1200, 900, body),
  );
}
await fs.writeFile(
  path.join(root, "docs/cms/visuals.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>SaaS Forge CMS illustrations</title><style>body{margin:0;padding:32px;background:${palette.paper};color:${palette.ink};font-family:system-ui}h1{font-size:32px}figure{margin:32px 0;overflow-x:auto;background:${palette.surface}}svg{display:block;width:100%;min-width:800px;height:auto}figcaption{padding:12px 24px}</style><h1>SaaS Forge CMS visual library</h1><p>Architecture and flow diagrams plus feature illustrations. Sources: module registry and implemented services. Generated with scripts/generate-cms-visuals.mjs.</p>${gallery.map((s, i) => `<figure>${s}<figcaption>Illustration ${i + 1}</figcaption></figure>`).join("")}</html>`,
);
console.log(
  `Generated ${gallery.length} SVG sources and PNG images, plus docs/cms/visuals.html.`,
);
