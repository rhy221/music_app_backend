import Cookies from 'js-cookie';
import { API_BASE, COOKIE_ACCESS_TOKEN } from '@/lib/constants';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    // refresh_token is HttpOnly — the Next.js route reads it server-side, no need to send it in body
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.accessToken) return null;
    Cookies.set(COOKIE_ACCESS_TOKEN, data.accessToken, {
      expires: data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : new Date(Date.now() + 15 * 60 * 1000),
      path: '/',
      sameSite: 'lax',
    });
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; noRedirect?: boolean } = {}
): Promise<T> {
  const { skipAuth, noRedirect, ...fetchOptions } = options;
  const token = skipAuth ? null : Cookies.get(COOKIE_ACCESS_TOKEN);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Remove Content-Type for FormData (let browser set it with boundary)
  if (fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
    } else {
      if (typeof window !== 'undefined') {
        Cookies.remove(COOKIE_ACCESS_TOKEN, { path: '/' });
      }
      if (!noRedirect && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status, data: err });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type FetchOpts = RequestInit & { skipAuth?: boolean; noRedirect?: boolean };

export function apiGet<T>(path: string, init?: FetchOpts) {
  return apiFetch<T>(path, { ...init, method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown, init?: FetchOpts) {
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown, init?: FetchOpts) {
  return apiFetch<T>(path, {
    ...init,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown, init?: FetchOpts) {
  return apiFetch<T>(path, {
    ...init,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function apiDelete<T = void>(path: string, init?: FetchOpts) {
  return apiFetch<T>(path, { ...init, method: 'DELETE' });
}
