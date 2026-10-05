// @vitest-environment node
import archiver from "archiver";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { appendFilesToZip } from "@workspace/ui/lib/zip-append";
import {
  SECRET_ENV_KEYS,
  isSecretEnvKey,
  secretEnvFiles,
  splitSecretEnv,
} from "@workspace/ui/lib/scaffold-secrets";
import { isSecretEnvKey as isMobileSecretEnvKey } from "../../../../mobile/components/downloads/secrets";
import { STRING_FIELD_KEYS } from "../../../../mobile/components/downloads/constants";

async function buildZip(files: Record<string, string>): Promise<Uint8Array<ArrayBuffer>> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });
  for (const [name, content] of Object.entries(files)) archive.append(content, { name });
  await archive.finalize();
  await done;
  return new Uint8Array(Buffer.concat(chunks));
}

describe("splitSecretEnv", () => {
  it("keeps secrets out of what is sent to the server", () => {
    const { publicEnv, secrets } = splitSecretEnv({
      NEXT_PUBLIC_THEME: "green",
      NEXT_PUBLIC_R2_PUBLIC_URL: "https://cdn.example.com",
      DATABASE_URL: "postgresql://canary",
      STRIPE_SECRET_KEY: "sk_canary",
      SOME_NEW_API_KEY: "fail-closed",
    });
    expect(publicEnv).toEqual({
      NEXT_PUBLIC_THEME: "green",
      NEXT_PUBLIC_R2_PUBLIC_URL: "https://cdn.example.com",
    });
    expect(Object.keys(secrets).sort()).toEqual(["DATABASE_URL", "SOME_NEW_API_KEY", "STRIPE_SECRET_KEY"]);
  });
});

describe("mobile secret classifier", () => {
  it("agrees with the shared classifier for every known key", () => {
    const keys = [...SECRET_ENV_KEYS, ...STRING_FIELD_KEYS.map(String), "NEXT_PUBLIC_URL", "SOME_NEW_API_KEY"];
    for (const key of keys) {
      expect(isMobileSecretEnvKey(key), key).toBe(isSecretEnvKey(key));
    }
  });
});

describe("appendFilesToZip", () => {
  it("adds secret env files to a server-built ZIP and keeps every original entry intact", async () => {
    const original = await buildZip({
      "app/README.md": "# Starter\n".repeat(200),
      "app/apps/web/.env": "NEXT_PUBLIC_THEME=green\n",
    });

    const files = secretEnvFiles("app", { DATABASE_URL: 'postgresql://u:p@db/app?x="1"', RESEND_API_KEY: "re_canary" });
    const augmented = appendFilesToZip(original, files);

    const zip = await JSZip.loadAsync(augmented, { checkCRC32: true });
    expect(Object.keys(zip.files).sort()).toEqual(
      ["app/README.md", "app/apps/web/.env", "app/apps/web/.env.local", "app/packages/database/.env"].sort(),
    );
    expect(await zip.file("app/README.md")!.async("string")).toBe("# Starter\n".repeat(200));
    expect(await zip.file("app/apps/web/.env.local")!.async("string")).toContain('RESEND_API_KEY="re_canary"');
    expect(await zip.file("app/packages/database/.env")!.async("string")).toBe(
      'DATABASE_URL="postgresql://u:p@db/app?x=\\"1\\""\n',
    );
    expect((zip.files["app/apps/web/.env.local"]!.unixPermissions as number) & 0o777).toBe(0o600);
  });

  it("returns the archive untouched when there are no secrets", async () => {
    const original = await buildZip({ "app/a.txt": "a" });
    expect(appendFilesToZip(original, secretEnvFiles("app", {}))).toBe(original);
  });

  it("rejects bytes that are not a ZIP", () => {
    expect(() => appendFilesToZip(new Uint8Array(64), [{ name: "x", content: "y" }])).toThrow("Not a ZIP archive");
  });
});
