import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function setTokenCookies(res: NextResponse, data: { accessToken: string; refreshToken: string; expiresIn: number }) {
  res.cookies.set('access_token', data.accessToken, {
    maxAge: data.expiresIn ?? 900,
    path: '/',
    sameSite: 'lax',
  });
  res.cookies.set('refresh_token', data.refreshToken, {
    maxAge: REFRESH_MAX_AGE,
    path: '/api/auth',
    httpOnly: true,
    sameSite: 'lax',
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const action = path.join('/');

  if (action === 'logout') {
    const refreshToken = req.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    const res = NextResponse.json({}, { status: 200 });
    res.cookies.set('access_token', '', { maxAge: 0, path: '/' });
    res.cookies.set('refresh_token', '', { maxAge: 0, path: '/api/auth', httpOnly: true });
    return res;
  }

  if (action === 'refresh') {
    const refreshToken = req.cookies.get('refresh_token')?.value;
    if (!refreshToken) return NextResponse.json({ error: 'No refresh token' }, { status: 401 });

    const backendRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!backendRes.ok) return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });

    const data = await backendRes.json();
    const res = NextResponse.json(data);
    await setTokenCookies(res, data);
    return res;
  }

  // login / register / oauth2/google
  const body = await req.text();
  const backendRes = await fetch(`${API_URL}/api/v1/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!backendRes.ok) {
    const err = await backendRes.json().catch(() => ({}));
    return NextResponse.json(err, { status: backendRes.status });
  }

  const data = await backendRes.json();
  const res = NextResponse.json(data);
  await setTokenCookies(res, data);
  return res;
}
