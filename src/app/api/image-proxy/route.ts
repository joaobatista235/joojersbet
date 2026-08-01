import { NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set(["media.api-sports.io"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return Response.json({ error: "Missing 'url' param" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (err) {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return Response.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return new Response(null, { status: res.status });

    const headers = new Headers(res.headers);
    // Encourage caching on CDN/browser for a day
    headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");

    const buffer = await res.arrayBuffer();
    return new Response(buffer, { status: 200, headers });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
