import { NextResponse } from "next/server";

const HF_TOKEN = process.env.HF_TOKEN;
const REPO_ID = process.env.REPO_ID || "";

async function getUniqueFilename(filename: string): Promise<string> {
  // Fetch dataset info to check existing files
  const res = await fetch(`https://huggingface.co/api/datasets/${REPO_ID}/tree/main`, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
  });

  if (!res.ok) return filename; // Fallback

  const files = await res.json();
  const existingNames = new Set(files.map((f: any) => f.path));

  if (!existingNames.has(filename)) return filename;

  const dotIndex = filename.lastIndexOf(".");
  const name = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;
  const ext = dotIndex !== -1 ? filename.substring(dotIndex) : "";

  let counter = 1;
  let newName = `${name} (${counter})${ext}`;
  while (existingNames.has(newName)) {
    counter++;
    newName = `${name} (${counter})${ext}`;
  }
  return newName;
}

export async function POST(req: Request) {
  if (!HF_TOKEN || !REPO_ID) {
    return NextResponse.json({ error: "HF_TOKEN or REPO_ID not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, filename, size, sha256 } = body;

    if (action === "init") {
      // Step 1: Resolve unique filename (e.g., file (1).txt)
      const uniqueFilename = await getUniqueFilename(filename);

      // Step 2: LFS Batch Request
      const CHUNK_SIZE = 4 * 1024 * 1024;
      const totalParts = Math.ceil(size / CHUNK_SIZE);
      const parts = Array.from({ length: totalParts }, (_, i) => ({
        size: i === totalParts - 1 ? size - i * CHUNK_SIZE : CHUNK_SIZE,
      }));

      const response = await fetch(`https://huggingface.co/datasets/${REPO_ID}.git/info/lfs/objects/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.git-lfs+json",
          "Accept": "application/vnd.git-lfs+json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          operation: "upload",
          transfers: ["multipart", "basic"],
          ref: { name: "refs/heads/main" },
          objects: [{ oid: sha256, size, parts }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HF LFS Batch error: ${err}`);
      }

      const result = await response.json();
      const object = result.objects[0];

      if (object.error) {
        throw new Error(`HF LFS Object error: ${object.error.message}`);
      }

      return NextResponse.json({
        success: true,
        actions: object.actions,
        uniqueFilename
      });
    }

    if (action === "verify") {
      const { verifyUrl, sha256, size } = body;
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.git-lfs+json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({ oid: sha256, size }),
      });
      if (!response.ok) throw new Error("Verification failed");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const url = req.headers.get("x-upload-url");
  if (!url) return NextResponse.json({ error: "Missing upload URL" }, { status: 400 });
  try {
    const body = await req.arrayBuffer();
    const response = await fetch(url, { method: "PUT", body });
    if (!response.ok) throw new Error(`S3 upload failed: ${response.statusText}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { action, filename, uniqueFilename, sha256, size, completeUrl } = body;

  try {
    if (action === "complete") {
      if (completeUrl) {
        await fetch(completeUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
      }

      const pointerContent = `version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${size}\n`;

      const commitRes = await fetch(`https://huggingface.co/api/datasets/${REPO_ID}/commit/main`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Upload ${uniqueFilename}`,
          operations: [
            {
              action: "add",
              path: uniqueFilename, // Standard readable filename
              content: Buffer.from(pointerContent).toString("base64"),
              encoding: "base64",
            },
          ],
        }),
      });

      if (!commitRes.ok) throw new Error(`Git Commit failed: ${await commitRes.text()}`);

      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host");
      const downloadUrl = `${protocol}://${host}/api/download/${uniqueFilename}`;

      return NextResponse.json({ success: true, downloadUrl });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
