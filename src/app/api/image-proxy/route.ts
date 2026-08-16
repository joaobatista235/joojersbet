import { NextRequest } from "next/server";

// Liberamos todos os domínios de imagens esportivas
const ALLOWED_HOSTS = new Set([
  "media.api-sports.io",
  "media-1.api-sports.io",
  "media-2.api-sports.io",
  "media-3.api-sports.io",
  "media-4.api-sports.io",
  "a.espncdn.com",
  "cdn.pandascore.co"
]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return Response.json({ error: "Missing 'url' param" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (err) {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Se o host não estiver na lista, apenas redireciona para a URL original
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return Response.redirect(url, 302);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    
    const res = await fetch(url, { 
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    
    clearTimeout(timeout);

    if (!res.ok) {
      return Response.redirect(url, 302);
    }

    const headers = new Headers(res.headers);
    headers.set("cache-control", "public, s-maxage=86400, stale-while-revalidate=604800");
    headers.delete("content-security-policy");
    headers.delete("x-frame-options");

    const buffer = await res.arrayBuffer();
    return new Response(buffer, { status: 200, headers });
  } catch (err) {
    return Response.redirect(url, 302);
  }
}
