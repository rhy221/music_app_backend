import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function setRefreshCookie(refreshToken: string) {
  const jar = await cookies();
  jar.set('refresh_token', refreshToken, {
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
    const jar = await cookies();
    jar.set('refresh_token', '', { maxAge: 0, path: '/api/auth', httpOnly: true });
    return NextResponse.json({}, { status: 200 });
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
    if (data.refreshToken) await setRefreshCookie(data.refreshToken);
    return NextResponse.json({ accessToken: data.accessToken, expiresIn: data.expiresIn });
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
  await setRefreshCookie(data.refreshToken);
  // accessToken returned in body — client sets the JS-readable cookie via js-cookie
  return NextResponse.json({
    accessToken: data.accessToken,
    expiresIn: data.expiresIn,
    user: data.user,
  });
}
