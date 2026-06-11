import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse(null, { status: 400 });

  try {
    const upstream = await fetch(url, { cache: 'force-cache' });
    if (!upstream.ok) return new NextResponse(null, { status: 404 });

    const buffer = await upstream.arrayBuffer();
    const ct = upstream.headers.get('content-type') ?? 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
