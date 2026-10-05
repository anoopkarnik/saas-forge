// @vitest-environment node
import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database/client", () => ({ default: {} }));

import {
  SecretNotAcceptedError,
  buildProjectZip,
  formValuesFromEnv,
} from "@/lib/scaffold/service";

async function readZip(stream: ReadableStream): Promise<JSZip> {
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return JSZip.loadAsync(bytes, { checkCRC32: true });
}

const base = {
  name: "Demo",
  projectName: "demo",
  modules: [] as never[],
  config: {},
  tierId: "custom",
  versionId: "custom",
};

describe("buildProjectZip", () => {
  it("writes public env files, ships the pruned lockfile and SETUP.md, and no secrets", async () => {
    const envVars = {
      NEXT_PUBLIC_URL: "https://demo.example.com",
      NEXT_PUBLIC_AUTH_GITHUB: "true",
      NEXT_PUBLIC_THEME: "orange",
    };
    const { stream } = buildProjectZip({ ...base, platforms: ["web", "mobile"], envVars });
    const zip = await readZip(stream);

    const webEnv = await zip.file("demo/apps/web/.env")!.async("string");
    expect(webEnv).toContain("NEXT_PUBLIC_URL=https://demo.example.com");
    expect(webEnv).toContain("NEXT_PUBLIC_THEME=orange");

    const mobileEnv = await zip.file("demo/apps/mobile/.env")!.async("string");
    expect(mobileEnv).toContain("EXPO_PUBLIC_API_URL=https://demo.example.com");
    expect(mobileEnv).toContain("EXPO_PUBLIC_AUTH_GITHUB=true");

    // Desktop was not selected; secrets have nowhere to go.
    expect(zip.file("demo/apps/desktop/.env")).toBeNull();
    expect(zip.file("demo/packages/database/.env")).toBeNull();

    expect(zip.file("demo/pnpm-lock.yaml")).not.toBeNull();
    expect(zip.file("demo/SETUP.md")).not.toBeNull();
  });

  it("refuses secrets before building anything", () => {
    expect(() =>
      buildProjectZip({ ...base, platforms: ["web"], envVars: { DATABASE_URL: "postgresql://canary" } }),
    ).toThrow(SecretNotAcceptedError);
  });
});

describe("formValuesFromEnv", () => {
  it("rebuilds the wizard's array fields from flat env vars", () => {
    expect(
      formValuesFromEnv({
        NEXT_PUBLIC_AUTH_EMAIL: "true",
        NEXT_PUBLIC_AUTH_GOOGLE: "false",
        NEXT_PUBLIC_AUTH_GITHUB: "true",
        NEXT_PUBLIC_PLATFORM: "web, desktop",
      }),
    ).toMatchObject({
      NEXT_PUBLIC_AUTH_PROVIDERS: ["email_verification", "github"],
      NEXT_PUBLIC_PLATFORM: ["web", "desktop"],
      NEXT_PUBLIC_SUPPORT_FEATURES: [],
    });
  });
});
