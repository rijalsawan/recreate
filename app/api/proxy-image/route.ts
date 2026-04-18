import { NextRequest, NextResponse } from 'next/server';

// GET /api/proxy-image?url=<encoded-url>
// Proxies external image URLs so the browser canvas can read cross-origin pixels.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  // Only allow https image URLs (SSRF protection)
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }
  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only https URLs are allowed', { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), { cache: 'no-store' });
  if (!upstream.ok) {
    return new NextResponse('Failed to fetch image', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/png';
  // Only allow image content types
  if (!contentType.startsWith('image/')) {
    return new NextResponse('Not an image', { status: 400 });
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
