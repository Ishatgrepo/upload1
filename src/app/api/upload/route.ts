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
      // Create a unique filename to prevent overwriting
      const uniqueFilename = `${Date.now()}-${filename}`;

      // Step 1: Request MULTIPART transfer from LFS Batch API
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
          objects: [{ oid: sha256, size }],
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

      // Return the actions and the unique filename
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

// Proxy for uploading a part to S3
export async function PUT(req: Request) {
  const url = req.headers.get("x-upload-url");
  if (!url) return NextResponse.json({ error: "Missing upload URL" }, { status: 400 });

  try {
    const body = await req.arrayBuffer();
    const response = await fetch(url, {
      method: "PUT",
      body,
    });

    if (!response.ok) {
      throw new Error(`S3 part upload failed: ${response.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Finalize and Commit
export async function PATCH(req: Request) {
  const body = await req.json();
  const { filename, uniqueFilename, sha256, size, completeUrl } = body;

  try {
    // 1. Complete the LFS multipart upload if a completeUrl was provided
    if (completeUrl) {
      const compRes = await fetch(completeUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!compRes.ok) throw new Error("Failed to complete LFS multipart upload");
    }

    // 2. Commit the LFS pointer to the Git repository
    const response = await fetch(`https://huggingface.co/api/datasets/${REPO_ID}/commit/main`, {
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
            path: uniqueFilename, // Use the unique filename here
            content: btoa(`version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${size}\n`),
            encoding: "base64",
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Commit failed: ${err}`);
    }

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const downloadUrl = `${protocol}://${host}/api/download/${uniqueFilename}`;

    return NextResponse.json({ success: true, downloadUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
