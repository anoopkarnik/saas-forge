import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";
import { headers } from "next/headers";
import { ratelimit } from "@/server/ratelimit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { success } = await ratelimit.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File size exceeds 10MB limit." }, { status: 400 });
  }

  const filename = file.name || `cms_${Date.now()}.png`;
  const storageProvider = process.env.NEXT_PUBLIC_IMAGE_STORAGE || "vercel_blob";

  if (storageProvider === "cloudflare_r2") {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });

    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${filename}`;
    const key = `cms-images/${uniqueFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
      ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return NextResponse.json({ url: publicUrl });
  }

  const blob = await put(filename, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url });
}
