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
      // Step 1: Pre-calculate a unique filename to prevent overwriting
      const uniqueFilename = `${Date.now()}-${filename}`;

      // Step 2: Call HF LFS Batch API with multipart transfer request
      // We explicitly request 'multipart' to get S3 part URLs
      const response = await fetch(`https://huggingface.co/datasets/${REPO_ID}.git/info/lfs/objects/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.git-lfs+json",
          "Accept": "application/vnd.git-lfs+json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          operation: "upload",
          transfers: ["multipart", "basic"], // Request multipart, fallback to basic
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

// Proxy for uploading a part to S3
// This must be a PUT request as expected by S3
export async function PUT(req: Request) {
  const url = req.headers.get("x-upload-url");
  if (!url) return NextResponse.json({ error: "Missing upload URL" }, { status: 400 });

  try {
    const body = await req.arrayBuffer();

    // We forward the PUT request to the S3 URL provided by HF
    const response = await fetch(url, {
      method: "PUT",
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

// Finalize and Commit
export async function PATCH(req: Request) {
  const body = await req.json();
  const { action, filename, uniqueFilename, sha256, size, completeUrl, completeHeader } = body;

  if (action !== "complete") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  try {
    // 1. If the multipart upload flow provided a 'complete' action, we MUST call it.
    // This action notifies HF that all S3 parts have been uploaded.
    if (completeUrl) {
      const compRes = await fetch(completeUrl, {
        method: "POST",
        headers: {
          "Authorization": completeHeader || `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!compRes.ok) {
        const err = await compRes.text();
        throw new Error(`LFS Multipart Complete failed: ${err}`);
      }
    }

    // 2. Commit the LFS pointer file to the Git repository.
    // This is what makes the file appear in the dataset.
    const commitResponse = await fetch(`https://huggingface.co/api/datasets/${REPO_ID}/commit/main`, {
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
            content: btoa(`version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${size}\n`),
            encoding: "base64",
          },
        ],
      }),
    });

    if (!commitResponse.ok) {
      const err = await commitResponse.text();
      throw new Error(`Git Commit failed: ${err}`);
    }

    // Construct the local download proxy URL
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const downloadUrl = `${protocol}://${host}/api/download/${uniqueFilename}`;

    return NextResponse.json({ success: true, downloadUrl });
  } catch (error: any) {
    console.error("Finalization error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
