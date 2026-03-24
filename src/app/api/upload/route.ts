import { NextResponse } from "next/server";

const HF_TOKEN = process.env.HF_TOKEN;
const REPO_ID = process.env.REPO_ID || "";

export async function POST(req: Request) {
  if (!HF_TOKEN || !REPO_ID) {
    return NextResponse.json({ error: "HF_TOKEN or REPO_ID not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, filename, size, sha256 } = body;

    if (action === "init") {
      const uniqueFilename = `${Date.now()}-${filename}`;

      // Calculate part sizes for multipart (approx 4MB each)
      // Vercel limit is 4.5MB, so 4MB is safe.
      const CHUNK_SIZE = 4 * 1024 * 1024;
      const totalParts = Math.ceil(size / CHUNK_SIZE);
      const parts = Array.from({ length: totalParts }, (_, i) => ({
        size: i === totalParts - 1 ? size - i * CHUNK_SIZE : CHUNK_SIZE,
      }));

      // LFS Batch Request with 'multipart' transfer
      const response = await fetch(`https://huggingface.co/datasets/${REPO_ID}.git/info/lfs/objects/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.git-lfs+json",
          "Accept": "application/vnd.git-lfs+json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          operation: "upload",
          transfers: ["multipart"],
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

      // If object.actions is missing, file might already exist on HF
      return NextResponse.json({
        success: true,
        actions: object.actions,
        uniqueFilename
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const url = req.headers.get("x-upload-url");
  const encodedHeaders = req.headers.get("x-upload-headers");

  if (!url) return NextResponse.json({ error: "Missing upload URL" }, { status: 400 });

  try {
    const headers = encodedHeaders ? JSON.parse(encodedHeaders) : {};
    const body = await req.arrayBuffer();

    // Forward the chunk to S3 with the signed headers provided by HF
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`S3 part upload failed: ${response.status} ${err}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("S3 Proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { action, filename, uniqueFilename, sha256, size, completeUrl, completeHeader } = body;

  try {
    if (action === "complete") {
      // 1. Complete the LFS multipart upload if the API provided a 'complete' action
      if (completeUrl) {
        const res = await fetch(completeUrl, {
          method: "POST",
          headers: {
            "Authorization": completeHeader || `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`LFS Complete failed: ${err}`);
        }
      }

      // 2. Final Git Commit with the LFS pointer content
      // The content of a Git LFS file is just a pointer to the actual LFS object.
      const pointerContent = `version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${size}\n`;

      const commitRes = await fetch(`https://huggingface.co/api/datasets/${REPO_ID}/commit/main`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Upload ${filename}`,
          operations: [
            {
              action: "add",
              path: uniqueFilename,
              content: Buffer.from(pointerContent).toString("base64"),
              encoding: "base64",
            },
          ],
        }),
      });

      if (!commitRes.ok) {
        const err = await commitRes.text();
        throw new Error(`Git Commit failed: ${err}`);
      }

      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host");
      const downloadUrl = `${protocol}://${host}/api/download/${uniqueFilename}`;

      return NextResponse.json({ success: true, downloadUrl });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Finalization error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
