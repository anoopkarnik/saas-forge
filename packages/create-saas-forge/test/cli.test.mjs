import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { ApiError, createClient } from "../src/api.mjs";
import { runNew, runUpgrade } from "../src/commands.mjs";
import { credentialsPath, saveCredentials } from "../src/config.mjs";
import { extractZip } from "../src/zip.mjs";

/** Minimal ZIP writer: { name: content | { content, mode, store } }. */
function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, spec] of Object.entries(entries)) {
    const { content = spec, mode = 0o644, store = false } = typeof spec === "object" ? spec : {};
    const raw = Buffer.from(content);
    const data = store ? raw : deflateRawSync(raw);
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(store ? 0 : 8, 8);
    local.writeUInt32LE(crc32(raw), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(store ? 0 : 8, 10);
    central.writeUInt32LE(crc32(raw), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(((0o100000 | mode) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, eocd]);
}

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "csf-"));

describe("extractZip", () => {
  it("drops the root folder and keeps content and executable bits", () => {
    const dir = tempDir();
    const zip = makeZip({
      "my-app/README.md": "# Starter\n".repeat(100),
      "my-app/scripts/setup.sh": { content: "#!/bin/sh\n", mode: 0o755 },
      "my-app/.env.local": { content: "KEY=1\n", store: true },
    });
    expect(extractZip(zip, dir).sort()).toEqual([".env.local", "README.md", "scripts/setup.sh"]);
    expect(fs.readFileSync(path.join(dir, "README.md"), "utf8")).toBe("# Starter\n".repeat(100));
    expect(fs.statSync(path.join(dir, "scripts/setup.sh")).mode & 0o777).toBe(0o755);
  });

  it("refuses entries that escape the target folder", () => {
    const dir = tempDir();
    expect(() => extractZip(makeZip({ "my-app/../../evil.txt": "x" }), dir)).toThrow(/outside the target folder/);
  });
});

describe("createClient", () => {
  const response = (bytes, headers) => ({
    ok: true,
    headers: new Headers(headers),
    arrayBuffer: async () => bytes,
    json: async () => ({}),
  });

  it("sends an idempotency key and verifies the checksum", async () => {
    const bytes = Buffer.from("zip-bytes");
    const sha = createHash("sha256").update(bytes).digest("hex");
    const fetchImpl = vi.fn(async () => response(bytes, { "X-Content-SHA256": sha, "X-Credits-Charged": "30" }));
    const client = createClient({ baseUrl: "https://example.com/", apiKey: "sk_test", fetchImpl });

    const result = await client.download("my-app", 30);
    expect(result.charged).toBe(30);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://example.com/api/v1/projects/my-app/download");
    expect(init.headers.Authorization).toBe("Bearer sk_test");
    expect(init.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(init.body)).toEqual({ expectedTotalCredits: 30 });
  });

  it("rejects a corrupted download", async () => {
    const fetchImpl = vi.fn(async () => response(Buffer.from("tampered"), { "X-Content-SHA256": "0".repeat(64) }));
    const client = createClient({ baseUrl: "https://example.com", apiKey: "k", fetchImpl });
    await expect(client.download("my-app", 30)).rejects.toMatchObject({ code: "checksum_mismatch" });
  });
});

function fakeClient(overrides = {}) {
  return {
    pricing: async () => ({
      baseCredits: 20,
      tierUpgradeCreditsPerStep: 3,
      modules: [
        { id: "billing", label: "Billing", creditsCost: 10, available: true, requires: [] },
        { id: "ai", label: "AI", creditsCost: 20, available: true, requires: [] },
        { id: "ai_agents", label: "Agents", creditsCost: 30, available: true, requires: ["ai"] },
      ],
    }),
    credits: async () => ({ credits: { total: 100, used: 0, remaining: 100 } }),
    createProject: vi.fn(async (input) => ({ project: { slug: "my-app", ...input } })),
    getProject: async () => ({ project: { slug: "my-app", modules: ["billing"], tierId: "tier-1" } }),
    download: vi.fn(async () => ({
      bytes: makeZip({ "my-app/README.md": "hi", "my-app/.boilerplate-version": "1.4.1\n" }),
      charged: 80,
    })),
    upgrade: vi.fn(),
    ...overrides,
  };
}

const io = (cwd, client) => ({
  cwd,
  env: { SAAS_FORGE_API_KEY: "sk_test", XDG_CONFIG_HOME: cwd },
  interactive: false,
  ask: async () => "",
  log: () => {},
  createClient: () => client,
});

describe("runNew", () => {
  it("creates the project, adds required modules, downloads and writes the marker", async () => {
    const cwd = tempDir();
    const client = fakeClient();
    const result = await runNew("my-app", { modules: "billing,ai_agents", platforms: "web,mobile", yes: true }, io(cwd, client));

    expect(client.createProject).toHaveBeenCalledWith({
      name: "my-app",
      modules: expect.arrayContaining(["billing", "ai_agents", "ai"]),
      platforms: ["web", "mobile"],
    });
    expect(client.download).toHaveBeenCalledWith("my-app", 80);
    expect(result.charged).toBe(80);
    expect(fs.readFileSync(path.join(cwd, "my-app/README.md"), "utf8")).toBe("hi");
    expect(JSON.parse(fs.readFileSync(path.join(cwd, "my-app/.saas-forge.json"), "utf8"))).toMatchObject({
      project: "my-app",
      templateVersion: "1.4.1",
    });
  });

  it("refuses a non-empty folder and needs --yes when not interactive", async () => {
    const cwd = tempDir();
    fs.mkdirSync(path.join(cwd, "taken"));
    fs.writeFileSync(path.join(cwd, "taken/file"), "x");
    await expect(runNew("taken", { yes: true }, io(cwd, fakeClient()))).rejects.toThrow(/not empty/);
    await expect(runNew("fresh", {}, io(cwd, fakeClient()))).rejects.toThrow(/--yes/);
  });

  it("points to top-up when credits run out", async () => {
    const cwd = tempDir();
    const client = fakeClient({
      download: async () => {
        throw new ApiError(403, "insufficient_credits", "Not enough credits.");
      },
    });
    await expect(runNew("my-app", { yes: true }, io(cwd, client))).rejects.toThrow(/Top up at https:\/\/saasforge.cc/);
  });
});

describe("runUpgrade", () => {
  it("prices a dry run without buying", async () => {
    const cwd = tempDir();
    fs.writeFileSync(path.join(cwd, ".saas-forge.json"), JSON.stringify({ project: "my-app" }));
    const client = fakeClient();
    const quote = await runUpgrade({ add: "ai_agents", tier: "tier-3", "dry-run": true }, io(cwd, client));
    expect(quote).toMatchObject({ dryRun: true, tierSteps: 2, credits: 20 + 30 + 2 * 3 });
    expect(quote.added.sort()).toEqual(["ai", "ai_agents"]);
    expect(client.upgrade).not.toHaveBeenCalled();
  });
});

describe("runUpgrade server choice", () => {
  it("refuses to send the key to a server named only by the project file", async () => {
    const cwd = tempDir();
    fs.writeFileSync(path.join(cwd, ".saas-forge.json"), JSON.stringify({ project: "my-app", apiUrl: "https://evil.example" }));
    const client = fakeClient({ pricing: vi.fn() });
    await expect(runUpgrade({ "dry-run": true }, io(cwd, client))).rejects.toThrow(/Pass --url/);
    expect(client.pricing).not.toHaveBeenCalled();
  });
});

describe("saveCredentials", () => {
  it("stores the key readable only by the user", () => {
    const env = { XDG_CONFIG_HOME: tempDir() };
    const file = saveCredentials({ apiKey: "sk_test" }, env);
    expect(file).toBe(credentialsPath(env));
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });
});
