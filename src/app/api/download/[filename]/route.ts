import { NextResponse } from "next/server";

const HF_TOKEN = process.env.HF_TOKEN;
const REPO_ID = process.env.REPO_ID || "";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!HF_TOKEN || !REPO_ID) {
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  try {
    const hfUrl = `https://huggingface.co/datasets/${REPO_ID}/resolve/main/${filename}`;

    const response = await fetch(hfUrl, {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "File not found or access denied" }, { status: response.status });
    }

    // Proxy the response
    const data = response.body;
    const headers = new Headers(response.headers);

    // Ensure it's treated as a download
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new Response(data, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
