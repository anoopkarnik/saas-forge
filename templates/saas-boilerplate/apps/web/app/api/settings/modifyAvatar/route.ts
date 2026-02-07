import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = file.name || `avatar_${Date.now()}.png`;

  const blob = await put(filename, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true
  });

  return NextResponse.json(blob);
}
