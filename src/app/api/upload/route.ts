import { NextResponse } from "next/server";

const HF_TOKEN = process.env.HF_TOKEN;
const REPO_ID = process.env.REPO_ID || ""; // Format: USER/REPO

export async function POST(req: Request) {
  if (!HF_TOKEN || !REPO_ID) {
    return NextResponse.json({ error: "HF_TOKEN or REPO_ID not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action, filename, size, sha256, parts, uploadUrl } = body;

    if (action === "init") {
      // Step 1: Call HF LFS Batch API to initialize multipart upload
      const response = await fetch(`https://huggingface.co/datasets/${REPO_ID}.git/info/lfs/objects/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.git-lfs+json",
          "Accept": "application/vnd.git-lfs+json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          operation: "upload",
          transfers: ["basic"],
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

      // If already uploaded, object will have 'actions' but maybe not 'upload'
      // For multipart, HF returns a list of upload URLs in the actions.
      return NextResponse.json({ success: true, actions: object.actions });
    }

    if (action === "upload_chunk") {
      // Step 2: Proxy the chunk to S3.
      // This is slightly tricky if the chunk comes as JSON.
      // But the client will send chunk as a blob in a separate request.
      // Wait, we can just return the S3 URL to the client and let them upload DIRECTLY if possible?
      // No, the requirement is to "Send chunks sequentially to the Next.js API route".
      // So we must proxy.

      // We need to handle binary data here.
      // Re-fetching the POST as formData or arrayBuffer.
      return NextResponse.json({ error: "Use binary endpoint for chunks" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// Separate handler for binary chunk proxy
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
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handler for commit
export async function PATCH(req: Request) {
  const { filename, sha256, size } = await req.json();
  if (!HF_TOKEN || !REPO_ID) return NextResponse.json({ error: "Config error" }, { status: 500 });

  try {
    // Commit to HF via the 'create commit' API
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
            path: filename,
            content: `version https://git-lfs.github.com/spec/v1\noid sha256:${sha256}\nsize ${size}\n`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Commit failed: ${err}`);
    }

    const [username, repoName] = REPO_ID.split("/");
    const downloadUrl = `https://huggingface.co/datasets/${username}/${repoName}/resolve/main/${filename}`;

    return NextResponse.json({ success: true, downloadUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
