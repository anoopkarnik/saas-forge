// @vitest-environment node
// Opt-in check of the real build cache bucket:
//   R2_LIVE=1 pnpm --dir apps/web exec vitest run lib/scaffold/__tests__/build-cache.live.test.ts
// Reads apps/web/.env, writes one tiny object under scaffold-builds/ and deletes it.
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHmac } from "node:crypto";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { getBuildCacheStore } from "@/lib/scaffold/build-cache";

// eslint-disable-next-line turbo/no-undeclared-env-vars -- opt-in flag for a manual test, not a build input
const live = process.env.R2_LIVE === "1";

describe.skipIf(!live)("build cache on R2 (live)", () => {
  it("misses, writes, reads back and cleans up", async () => {
    const env = { ...process.env, ...config({ path: ".env" }).parsed };
    const store = getBuildCacheStore(env);
    expect(store, "R2 credentials missing from apps/web/.env").not.toBeNull();

    const name = `live-check-${Date.now()}.txt`;
    expect(await store!.get(name)).toBeNull();

    await store!.put(name, new TextEncoder().encode("ok"), "text/plain");
    expect(new TextDecoder().decode((await store!.get(name))!)).toBe("ok");

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
    });
    const key = `scaffold-builds/${createHmac("sha256", env.R2_SECRET_ACCESS_KEY!).update(name).digest("hex")}`;
    await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
    expect(await store!.get(name)).toBeNull();
  });
});
